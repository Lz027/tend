/**
 * Tend lead intake pipeline (server only).
 *
 * validate -> dedupe -> create/update lead -> score -> route -> SLA task ->
 * timeline -> consent -> notification.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  routeLead,
  scoreLead,
  slaLabel,
  slaMinutesFor,
  type RoutingRule,
  type ScorableLead,
  type ScoringRule,
} from "@/lib/lead-scoring";

export interface IntakeMeta {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  referrer?: string | null;
  landing_page?: string | null;
  device_type?: string | null;
}

export interface IntakeInput {
  workspaceId: string;
  formId: string | null;
  source: string;
  values: Record<string, unknown>;
  custom: Record<string, unknown>;
  meta: IntakeMeta;
  consent?: { granted: boolean; text?: string | null; version?: string } | null;
  idempotencyKey?: string | null;
}

export interface IntakeResult {
  leadId: string;
  duplicate: boolean;
  score: number;
  band: string;
  reasons: { label: string; points: number }[];
  ownerId: string | null;
  taskId: string | null;
}

const text = (v: unknown) => {
  const s =
    typeof v === "string" ? v.trim() : v === null || v === undefined ? "" : String(v).trim();
  return s.length ? s.slice(0, 2000) : null;
};

const numeric = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number.parseFloat(String(v).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

export async function processLeadIntake(input: IntakeInput): Promise<IntakeResult> {
  const v = input.values;
  const email = text(v["email"])?.toLowerCase() ?? null;
  const phone = text(v["phone"]);
  const fullName = text(v["name"]) ?? text(v["full_name"]);

  if (!email && !phone) throw new Error("An email address or phone number is required.");

  const emailNorm = email?.replace(/\+[^@]*@/, "@") ?? null;
  const phoneNorm = phone ? phone.replace(/[^0-9]/g, "") : null;

  // ---- idempotency -------------------------------------------------------
  if (input.idempotencyKey) {
    const { data: seen } = await supabaseAdmin
      .from("lead_submissions")
      .select("lead_id")
      .eq("workspace_id", input.workspaceId)
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();
    if (seen?.lead_id) {
      const { data: lead } = await supabaseAdmin
        .from("leads")
        .select("id, score, score_band, owner_id, score_breakdown")
        .eq("id", seen.lead_id)
        .maybeSingle();
      return {
        leadId: seen.lead_id,
        duplicate: true,
        score: lead?.score ?? 0,
        band: lead?.score_band ?? "cold",
        reasons: [],
        ownerId: lead?.owner_id ?? null,
        taskId: null,
      };
    }
  }

  // ---- duplicate detection: email first, phone second ---------------------
  let existing: { id: string; owner_id: string | null; submission_count: number } | null = null;
  if (emailNorm) {
    const { data } = await supabaseAdmin
      .from("leads")
      .select("id, owner_id, submission_count")
      .eq("workspace_id", input.workspaceId)
      .eq("email_normalized", emailNorm)
      .order("created_at", { ascending: true })
      .limit(1);
    existing = data?.[0] ?? null;
  }
  if (!existing && phoneNorm) {
    const { data } = await supabaseAdmin
      .from("leads")
      .select("id, owner_id, submission_count")
      .eq("workspace_id", input.workspaceId)
      .eq("phone_normalized", phoneNorm)
      .order("created_at", { ascending: true })
      .limit(1);
    existing = data?.[0] ?? null;
  }

  const scorable: ScorableLead = {
    full_name: fullName,
    email,
    phone,
    company: text(v["company"]),
    job_title: text(v["job_title"]),
    country: text(v["country"]),
    interest: text(v["interest"]),
    budget: numeric(v["budget"]),
    message: text(v["message"]),
    preferred_contact: text(v["preferred_contact"]),
    source: input.source,
    utm_source: input.meta.utm_source ?? null,
    custom_fields: input.custom as never,
  };

  // ---- scoring -----------------------------------------------------------
  const { data: scoringRules } = await supabaseAdmin
    .from("scoring_rules")
    .select("id, label, field, operator, value, points, priority, is_active")
    .eq("workspace_id", input.workspaceId)
    .eq("is_active", true);

  const scored = scoreLead(scorable, (scoringRules ?? []) as ScoringRule[]);

  // ---- lead row ----------------------------------------------------------
  const base = {
    workspace_id: input.workspaceId,
    form_id: input.formId,
    source: input.source,
    full_name: fullName,
    email,
    phone,
    company: scorable.company ?? null,
    job_title: scorable.job_title ?? null,
    country: scorable.country ?? null,
    interest: scorable.interest ?? null,
    budget: scorable.budget as number | null,
    message: scorable.message ?? null,
    preferred_contact: scorable.preferred_contact ?? null,
    custom_fields: input.custom as never,
    score: scored.score,
    score_band: scored.band as never,
    score_breakdown: scored.reasons as never,
    last_activity_at: new Date().toISOString(),
    last_touch_source: input.source,
    utm_source: input.meta.utm_source ?? null,
    utm_medium: input.meta.utm_medium ?? null,
    utm_campaign: input.meta.utm_campaign ?? null,
    utm_term: input.meta.utm_term ?? null,
    utm_content: input.meta.utm_content ?? null,
    referrer: input.meta.referrer ?? null,
    landing_page: input.meta.landing_page ?? null,
    device_type: input.meta.device_type ?? null,
  };

  let leadId: string;
  let ownerId: string | null = null;
  let taskId: string | null = null;
  const isDuplicate = Boolean(existing);

  if (existing) {
    const { data: updated, error } = await supabaseAdmin
      .from("leads")
      .update({ ...base, submission_count: (existing.submission_count ?? 1) + 1 })
      .eq("id", existing.id)
      .select("id, owner_id")
      .single();
    if (error) throw error;
    leadId = updated.id;
    ownerId = updated.owner_id;

    await supabaseAdmin.from("activities").insert({
      workspace_id: input.workspaceId,
      lead_id: leadId,
      type: "system.duplicate",
      title: "Repeat enquiry matched to this lead",
      body: `Matched on ${emailNorm ? "email" : "phone"}. Score is now ${scored.score}.`,
      meta: { source: input.source } as never,
    });
  } else {
    const { data: inserted, error } = await supabaseAdmin
      .from("leads")
      .insert({ ...base, first_touch_source: input.source })
      .select("id")
      .single();
    if (error) throw error;
    leadId = inserted.id;

    await supabaseAdmin.from("activities").insert([
      {
        workspace_id: input.workspaceId,
        lead_id: leadId,
        type: "system.created",
        title: "Lead captured",
        body: `Came in from ${input.source}.`,
        meta: input.meta as never,
      },
      {
        workspace_id: input.workspaceId,
        lead_id: leadId,
        type: "system.scored",
        title: `Scored ${scored.score} — ${scored.band}`,
        body:
          scored.reasons
            .map((r) => `${r.label} (${r.points > 0 ? "+" : ""}${r.points})`)
            .join(", ") || "No rules matched.",
        meta: { reasons: scored.reasons } as never,
      },
    ]);

    // ---- routing ---------------------------------------------------------
    const [{ data: routingRules }, { data: members }, { count }] = await Promise.all([
      supabaseAdmin
        .from("routing_rules")
        .select("id, label, field, operator, value, assign_to, strategy, priority, is_active")
        .eq("workspace_id", input.workspaceId)
        .eq("is_active", true),
      supabaseAdmin
        .from("memberships")
        .select("user_id, role")
        .eq("workspace_id", input.workspaceId),
      supabaseAdmin
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", input.workspaceId),
    ]);

    const route = routeLead(
      { ...scorable, score: scored.score },
      (routingRules ?? []) as RoutingRule[],
      (members ?? []) as { user_id: string; role: string }[],
      count ?? 0,
    );
    ownerId = route.ownerId;

    if (ownerId) {
      await supabaseAdmin.from("leads").update({ owner_id: ownerId }).eq("id", leadId);
    }

    await supabaseAdmin.from("activities").insert({
      workspace_id: input.workspaceId,
      lead_id: leadId,
      type: "system.routed",
      title: ownerId ? "Owner assigned" : "No owner yet",
      body: route.reason,
      meta: { strategy: route.strategy, rule: route.ruleLabel } as never,
    });

    // ---- SLA follow-up task ---------------------------------------------
    const sla = slaMinutesFor(scored.band);
    const dueAt = new Date(Date.now() + sla * 60_000).toISOString();
    const { data: task } = await supabaseAdmin
      .from("tasks")
      .insert({
        workspace_id: input.workspaceId,
        lead_id: leadId,
        assignee_id: ownerId,
        title: `Follow up with ${fullName ?? email ?? "new lead"}`,
        description: `First response promised within ${slaLabel(sla)}.`,
        type: "follow_up" as never,
        priority: (scored.band === "hot"
          ? "urgent"
          : scored.band === "qualified"
            ? "high"
            : "normal") as never,
        due_at: dueAt,
        sla_minutes: sla,
      })
      .select("id")
      .single();
    taskId = task?.id ?? null;

    await supabaseAdmin.from("activities").insert({
      workspace_id: input.workspaceId,
      lead_id: leadId,
      type: "system.task",
      title: "Follow-up task created",
      body: `Due within ${slaLabel(sla)}.`,
      meta: { task_id: taskId } as never,
    });

    if (ownerId) {
      await supabaseAdmin.from("notifications").insert({
        workspace_id: input.workspaceId,
        user_id: ownerId,
        lead_id: leadId,
        task_id: taskId,
        type: "lead.assigned",
        title: `New ${scored.band} lead: ${fullName ?? email ?? "enquiry"}`,
        body: `Scored ${scored.score}. Follow up within ${slaLabel(sla)}.`,
      });
    }
  }

  // ---- submission + consent ---------------------------------------------
  await supabaseAdmin.from("lead_submissions").insert({
    workspace_id: input.workspaceId,
    form_id: input.formId,
    lead_id: leadId,
    idempotency_key: input.idempotencyKey ?? null,
    payload: { ...input.values, custom: input.custom } as never,
    meta: input.meta as never,
  });

  if (input.consent) {
    await supabaseAdmin.from("consent_records").insert({
      workspace_id: input.workspaceId,
      lead_id: leadId,
      granted: input.consent.granted,
      consent_text: input.consent.text ?? null,
      consent_version: input.consent.version ?? "1",
      purpose: "contact",
      source: input.source,
    });
  }

  return {
    leadId,
    duplicate: isDuplicate,
    score: scored.score,
    band: scored.band,
    reasons: scored.reasons,
    ownerId,
    taskId,
  };
}
