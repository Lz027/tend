/**
 * Poppy's explainable, rule-based lead scoring.
 *
 * Pure functions only — shared by the submission pipeline (server) and the
 * "Test a lead" simulator on the Rules page (browser).
 */

export type ScoreBand = "cold" | "warm" | "qualified" | "hot" | "disqualified";

export interface ScoringRule {
  id?: string;
  label: string;
  field: string;
  operator: string;
  value: string | null;
  points: number;
  priority?: number;
  is_active?: boolean;
}

export interface RoutingRule {
  id?: string;
  label: string;
  field: string;
  operator: string;
  value: string | null;
  assign_to: string | null;
  strategy: string;
  priority?: number;
  is_active?: boolean;
}

export interface ScorableLead {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  job_title?: string | null;
  country?: string | null;
  interest?: string | null;
  budget?: number | string | null;
  message?: string | null;
  preferred_contact?: string | null;
  source?: string | null;
  utm_source?: string | null;
  do_not_contact?: boolean | null;
  custom_fields?: Record<string, unknown> | null;
  score?: number;
}

export interface ScoreReason {
  label: string;
  points: number;
}

export interface ScoreResult {
  score: number;
  band: ScoreBand;
  reasons: ScoreReason[];
}

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "live.com", "icloud.com",
  "aol.com", "proton.me", "protonmail.com", "mail.com", "gmx.com", "yandex.com",
]);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function scoreBandFor(score: number): ScoreBand {
  if (score < 0) return "disqualified";
  if (score >= 80) return "hot";
  if (score >= 60) return "qualified";
  if (score >= 30) return "warm";
  return "cold";
}

export const SCORE_BANDS: { band: ScoreBand; label: string; range: string }[] = [
  { band: "cold", label: "Cold", range: "0–29" },
  { band: "warm", label: "Warm", range: "30–59" },
  { band: "qualified", label: "Qualified", range: "60–79" },
  { band: "hot", label: "Hot", range: "80–100" },
];

function fieldValue(lead: ScorableLead, field: string): unknown {
  if (field === "any") return true;
  if (field in lead) return (lead as Record<string, unknown>)[field];
  return lead.custom_fields?.[field];
}

function asText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const cleaned = String(value).replace(/[^0-9.\-]/g, "");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function matchesRule(
  lead: ScorableLead,
  rule: { field: string; operator: string; value: string | null },
): boolean {
  const raw = fieldValue(lead, rule.field);
  const text = asText(raw);
  const compare = asText(rule.value);

  switch (rule.operator) {
    case "always":
      return true;
    case "is_present":
      return text.length > 0 && text !== "0";
    case "is_absent":
      return text.length === 0;
    case "is_true":
      return raw === true || text.toLowerCase() === "true";
    case "equals":
      return text.toLowerCase() === compare.toLowerCase();
    case "not_equals":
      return text.toLowerCase() !== compare.toLowerCase();
    case "contains":
      return compare.length > 0 && text.toLowerCase().includes(compare.toLowerCase());
    case "not_contains":
      return compare.length > 0 && !text.toLowerCase().includes(compare.toLowerCase());
    case "longer_than":
      return text.length > (asNumber(compare) ?? 0);
    case "greater_than": {
      const n = asNumber(raw);
      return n !== null && n > (asNumber(compare) ?? 0);
    }
    case "less_than": {
      const n = asNumber(raw);
      return n !== null && n < (asNumber(compare) ?? 0);
    }
    case "is_business_email": {
      if (!EMAIL_PATTERN.test(text)) return false;
      const domain = text.split("@")[1]?.toLowerCase() ?? "";
      return domain.length > 0 && !FREE_EMAIL_DOMAINS.has(domain);
    }
    case "is_invalid_email":
      return text.length > 0 && !EMAIL_PATTERN.test(text);
    default:
      return false;
  }
}

export function scoreLead(lead: ScorableLead, rules: ScoringRule[]): ScoreResult {
  const reasons: ScoreReason[] = [];
  let total = 0;

  for (const rule of [...rules].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))) {
    if (rule.is_active === false) continue;
    if (!matchesRule(lead, rule)) continue;
    total += rule.points;
    reasons.push({ label: rule.label, points: rule.points });
  }

  const clamped = Math.max(-100, Math.min(100, total));
  return { score: Math.max(0, clamped), band: scoreBandFor(clamped), reasons };
}

export interface RouteResult {
  ownerId: string | null;
  strategy: string;
  ruleLabel: string;
  reason: string;
}

/**
 * Priority rules first; round-robin over workspace members as the fallback.
 */
export function routeLead(
  lead: ScorableLead & { score: number },
  rules: RoutingRule[],
  members: { user_id: string; role: string }[],
  roundRobinIndex: number,
): RouteResult {
  const ordered = [...rules]
    .filter((rule) => rule.is_active !== false)
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

  for (const rule of ordered) {
    if (!matchesRule(lead, rule)) continue;

    if (rule.strategy === "specific" && rule.assign_to) {
      return {
        ownerId: rule.assign_to,
        strategy: "specific",
        ruleLabel: rule.label,
        reason: `Matched "${rule.label}"`,
      };
    }

    if (rule.strategy === "owner") {
      const owner = members.find((m) => m.role === "owner");
      if (owner) {
        return {
          ownerId: owner.user_id,
          strategy: "owner",
          ruleLabel: rule.label,
          reason: `Matched "${rule.label}" — sent to the workspace owner`,
        };
      }
    }

    if (rule.strategy === "round_robin" && members.length > 0) {
      const picked = members[Math.abs(roundRobinIndex) % members.length];
      return {
        ownerId: picked.user_id,
        strategy: "round_robin",
        ruleLabel: rule.label,
        reason: `Round-robin turn (${rule.label})`,
      };
    }
  }

  if (members.length > 0) {
    const picked = members[Math.abs(roundRobinIndex) % members.length];
    return {
      ownerId: picked.user_id,
      strategy: "round_robin",
      ruleLabel: "Round-robin fallback",
      reason: "No priority rule matched — round-robin turn",
    };
  }

  return { ownerId: null, strategy: "none", ruleLabel: "Unassigned", reason: "No one to assign to yet" };
}

/** SLA window in minutes, by band. */
export function slaMinutesFor(band: ScoreBand): number {
  switch (band) {
    case "hot":
      return 240; // 4 hours
    case "qualified":
      return 480; // 8 hours
    case "warm":
      return 1440; // 1 day
    default:
      return 4320; // 3 days
  }
}

export function slaLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} hours`;
  return `${Math.round(minutes / 1440)} days`;
}

export function nextActionFor(input: {
  band: ScoreBand;
  status: string;
  ownerName?: string | null;
  leadName?: string | null;
  overdue?: boolean;
}): { action: string; urgency: "high" | "normal" | "low" } {
  const name = input.leadName || "this lead";
  if (input.status === "won" || input.status === "lost" || input.status === "disqualified") {
    return { action: `Nothing pending — ${name} is closed.`, urgency: "low" };
  }
  if (input.overdue) {
    return { action: `Follow up with ${name} now — the promised window has passed.`, urgency: "high" };
  }
  if (input.status === "new") {
    const window = slaLabel(slaMinutesFor(input.band));
    return { action: `Contact ${name} within ${window}.`, urgency: input.band === "hot" ? "high" : "normal" };
  }
  if (input.status === "contacted") {
    return { action: `Qualify ${name}: confirm budget, scope and start date.`, urgency: "normal" };
  }
  if (input.status === "qualified") {
    return { action: `Send ${name} a proposal.`, urgency: "normal" };
  }
  return { action: `Move ${name} forward to a decision.`, urgency: "normal" };
}
