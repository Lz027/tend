import { createFileRoute } from "@tanstack/react-router";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });

/** Inbound automation endpoint: Make, n8n, Zapier or any script can POST a lead here. */
export const Route = createFileRoute("/api/public/intake/$token")({
  server: {
    handlers: {
      OPTIONS: () =>
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type, idempotency-key",
          },
        }),
      POST: async ({ request, params }) => {
        const raw = await request.text();
        if (raw.length > 100_000) return json({ error: "Payload too large." }, 413);

        let body: Record<string, unknown>;
        try {
          body = JSON.parse(raw || "{}");
        } catch {
          return json({ error: "Invalid JSON." }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { processLeadIntake } = await import("@/lib/lead-intake.server");

        const { data: source } = await supabaseAdmin
          .from("automation_sources")
          .select("id, workspace_id, is_active, field_mapping, provider, name, received_count, error_count")
          .eq("token", params.token)
          .maybeSingle();

        if (!source || !source.is_active) return json({ error: "Unknown or paused source." }, 404);

        const mapping = (source.field_mapping ?? {}) as Record<string, string>;
        const values: Record<string, unknown> = {};
        const custom: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(body)) {
          const target = mapping[key] ?? key;
          if (["name", "full_name", "email", "phone", "company", "job_title", "country", "interest", "budget", "message", "preferred_contact"].includes(target)) {
            values[target] = value;
          } else {
            custom[target] = value;
          }
        }

        try {
          const result = await processLeadIntake({
            workspaceId: source.workspace_id,
            formId: null,
            source: source.provider || "api",
            values,
            custom,
            meta: { referrer: request.headers.get("referer") },
            consent: null,
            idempotencyKey: request.headers.get("idempotency-key"),
          });

          await supabaseAdmin
            .from("automation_sources")
            .update({
              received_count: (source.received_count ?? 0) + 1,
              last_received_at: new Date().toISOString(),
              sample_payload: body,
            })
            .eq("id", source.id);

          return json({ ok: true, lead_id: result.leadId, duplicate: result.duplicate, score: result.score, band: result.band });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Could not accept this lead.";
          await supabaseAdmin
            .from("automation_sources")
            .update({ error_count: (source.error_count ?? 0) + 1, last_error: message, sample_payload: body })
            .eq("id", source.id);
          return json({ error: message }, 400);
        }
      },
    },
  },
});
