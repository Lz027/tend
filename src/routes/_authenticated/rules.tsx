import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { AppShell, useWorkspace } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  SCORE_BANDS,
  routeLead,
  scoreLead,
  slaLabel,
  slaMinutesFor,
  type RoutingRule,
  type ScoringRule,
} from "@/lib/lead-scoring";

export const Route = createFileRoute("/_authenticated/rules")({
  head: () => ({
    meta: [
      { title: "Rules | Tend" },
      {
        name: "description",
        content: "See exactly how Tend scores and assigns a lead, and try it on a test enquiry.",
      },
      { property: "og:title", content: "Rules | Tend" },
      {
        property: "og:description",
        content: "Explainable scoring and routing rules with a test-a-lead simulator.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RulesPage,
});

function RulesPage() {
  const workspace = useWorkspace();
  const workspaceId = workspace.data?.workspace?.id;
  const queryClient = useQueryClient();

  const [test, setTest] = useState({
    full_name: "Sam Rivera",
    email: "sam@studionorth.com",
    phone: "",
    company: "Studio North",
    budget: "8000",
    interest: "Brand identity",
    message:
      "We need a full rebrand before our launch in March. Budget is flexible for the right team.",
  });

  const rules = useQuery({
    queryKey: ["rules", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const [scoring, routing, members] = await Promise.all([
        supabase
          .from("scoring_rules")
          .select("*")
          .eq("workspace_id", workspaceId!)
          .order("priority"),
        supabase
          .from("routing_rules")
          .select("*")
          .eq("workspace_id", workspaceId!)
          .order("priority"),
        supabase.from("memberships").select("user_id, role").eq("workspace_id", workspaceId!),
      ]);
      if (scoring.error) throw scoring.error;
      if (routing.error) throw routing.error;
      if (members.error) throw members.error;
      return { scoring: scoring.data, routing: routing.data, members: members.data };
    },
  });

  const toggle = useMutation({
    mutationFn: async ({
      table,
      id,
      active,
    }: {
      table: "scoring_rules" | "routing_rules";
      id: string;
      active: boolean;
    }) => {
      const { error } = await supabase.from(table).update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rules"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const simulation = useMemo(() => {
    const scoring = (rules.data?.scoring ?? []) as ScoringRule[];
    const routing = (rules.data?.routing ?? []) as RoutingRule[];
    const members = rules.data?.members ?? [];
    const lead = { ...test, budget: Number(test.budget) || null };
    const result = scoreLead(lead, scoring);
    const route = routeLead({ ...lead, score: result.score }, routing, members, 0);
    return { result, route };
  }, [rules.data, test]);

  return (
    <AppShell title="Rules">
      <p className="mb-6 max-w-2xl text-muted-foreground">
        Tend never hides how a lead got its score. Turn rules on or off, then drop in a test enquiry
        to see the exact result.
      </p>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border p-5">
            <h2 className="font-display text-2xl">Scoring rules</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Points add up to a 0–100 score and a band.
            </p>
            <ul className="space-y-2">
              {(rules.data?.scoring ?? []).map((rule) => (
                <li key={rule.id} className="flex items-center gap-3 rounded-xl border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{rule.label}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {rule.field} · {rule.operator.replace(/_/g, " ")}
                      {rule.value ? ` · ${rule.value}` : ""}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold ${rule.points < 0 ? "text-destructive" : "text-primary"}`}
                  >
                    {rule.points > 0 ? `+${rule.points}` : rule.points}
                  </span>
                  <Switch
                    checked={rule.is_active}
                    aria-label={`Toggle ${rule.label}`}
                    onCheckedChange={(active) =>
                      toggle.mutate({ table: "scoring_rules", id: rule.id, active })
                    }
                  />
                </li>
              ))}
              {rules.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading rules…</p>
              ) : null}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              {SCORE_BANDS.map((b) => (
                <span
                  key={b.band}
                  className={`rounded-full px-3 py-1 text-xs font-semibold score-${b.band}`}
                >
                  {b.label} {b.range}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border p-5">
            <h2 className="font-display text-2xl">Routing rules</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              First match wins; round robin catches the rest.
            </p>
            <ul className="space-y-2">
              {(rules.data?.routing ?? []).map((rule) => (
                <li key={rule.id} className="flex items-center gap-3 rounded-xl border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{rule.label}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {rule.field} · {rule.operator.replace(/_/g, " ")} →{" "}
                      {rule.strategy.replace(/_/g, " ")}
                    </p>
                  </div>
                  <Switch
                    checked={rule.is_active}
                    aria-label={`Toggle ${rule.label}`}
                    onCheckedChange={(active) =>
                      toggle.mutate({ table: "routing_rules", id: rule.id, active })
                    }
                  />
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="h-fit rounded-2xl border bg-card p-5">
          <h2 className="flex items-center gap-2 font-display text-2xl">
            <FlaskConical className="size-5 text-primary" /> Test a lead
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Nothing is saved — this is a dry run.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["full_name", "Name"],
                ["email", "Email"],
                ["phone", "Phone"],
                ["company", "Company"],
                ["budget", "Budget"],
                ["interest", "Interest"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <Label htmlFor={`test-${key}`} className="text-xs">
                  {label}
                </Label>
                <Input
                  id={`test-${key}`}
                  value={test[key]}
                  onChange={(e) => setTest({ ...test, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Label htmlFor="test-message" className="text-xs">
              Message
            </Label>
            <Textarea
              id="test-message"
              rows={3}
              value={test.message}
              onChange={(e) => setTest({ ...test, message: e.target.value })}
            />
          </div>

          <div className="mt-5 rounded-xl border bg-background p-4">
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold capitalize score-${simulation.result.band}`}
              >
                {simulation.result.score} · {simulation.result.band}
              </span>
              <span className="text-xs text-muted-foreground">
                Respond within {slaLabel(slaMinutesFor(simulation.result.band))}
              </span>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {simulation.result.reasons.map((reason, index) => (
                <li key={`${reason.label}-${index}`} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">{reason.label}</span>
                  <span className={reason.points < 0 ? "text-destructive" : "text-primary"}>
                    {reason.points > 0 ? `+${reason.points}` : reason.points}
                  </span>
                </li>
              ))}
              {simulation.result.reasons.length === 0 ? (
                <li className="text-muted-foreground">No rule matched this enquiry.</li>
              ) : null}
            </ul>
            <p className="mt-4 text-sm">
              <span className="font-medium">Assignment:</span> {simulation.route.reason}
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
