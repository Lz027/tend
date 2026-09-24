import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bot, CheckCircle2, Mail, User } from "lucide-react";
import { AppShell, useWorkspace } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { nextActionFor, type ScoreBand } from "@/lib/lead-scoring";

export const Route = createFileRoute("/_authenticated/leads/$leadId")({
  head: () => ({
    meta: [
      { title: "Lead detail | Tend" },
      {
        name: "description",
        content: "Score reasons, recommended next action and the full lead timeline.",
      },
      { property: "og:title", content: "Lead detail | Tend" },
      {
        property: "og:description",
        content: "Score reasons, next action and the full lead timeline.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LeadDetailPage,
});

const statusFlow = ["new", "contacted", "qualified", "proposal", "won", "lost"] as const;

function LeadDetailPage() {
  const { leadId } = Route.useParams();
  const workspace = useWorkspace();
  const queryClient = useQueryClient();

  const lead = useQuery({
    queryKey: ["lead", leadId],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").eq("id", leadId).single();
      if (error) throw error;
      return data;
    },
  });

  const timeline = useQuery({
    queryKey: ["lead-timeline", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("id, type, title, body, created_at, actor_id")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const tasks = useQuery({
    queryKey: ["lead-tasks", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, status, due_at, priority")
        .eq("lead_id", leadId)
        .order("due_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const setStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase
        .from("leads")
        .update({ status: status as never, last_activity_at: new Date().toISOString() })
        .eq("id", leadId);
      if (error) throw error;
      await supabase.from("activities").insert({
        workspace_id: lead.data!.workspace_id,
        lead_id: leadId,
        actor_id: workspace.data?.user.id ?? null,
        type: "human.status",
        title: `Status changed to ${status}`,
        body: null,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
      void queryClient.invalidateQueries({ queryKey: ["lead-timeline", leadId] });
    },
  });

  const claim = useMutation({
    mutationFn: async () => {
      const userId = workspace.data?.user.id;
      if (!userId) return;
      const { error } = await supabase.from("leads").update({ owner_id: userId }).eq("id", leadId);
      if (error) throw error;
      await supabase.from("activities").insert({
        workspace_id: lead.data!.workspace_id,
        lead_id: leadId,
        actor_id: userId,
        type: "human.assigned",
        title: "Lead claimed",
        body: null,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
      void queryClient.invalidateQueries({ queryKey: ["lead-timeline", leadId] });
    },
  });

  if (lead.isLoading || !lead.data) {
    return (
      <AppShell title="Lead">
        <p className="text-muted-foreground">Loading lead…</p>
      </AppShell>
    );
  }

  const row = lead.data;
  const openTask = (tasks.data ?? []).find(
    (t) => t.status === "open" || t.status === "in_progress",
  );
  const overdue = Boolean(openTask?.due_at && new Date(openTask.due_at) < new Date());
  const recommendation = nextActionFor({
    band: row.score_band as ScoreBand,
    status: row.status,
    leadName: row.full_name ?? row.email,
    overdue,
  });
  const reasons = (row.score_breakdown as { label: string; points: number }[] | null) ?? [];

  return (
    <AppShell title={row.full_name || row.email || "Lead"}>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/leads">
          <ArrowLeft className="size-4" /> All leads
        </Link>
      </Button>

      <div
        className={`mb-6 rounded-3xl border p-6 ${recommendation.urgency === "high" ? "border-destructive/40 bg-destructive/5" : "bg-accent/10"}`}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Recommended next action
        </p>
        <h2 className="mt-2 font-display text-2xl">{recommendation.action}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {row.email ? (
            <Button asChild size="sm" className="pop-press">
              <a href={`mailto:${row.email}`}>
                <Mail className="size-4" /> Email lead
              </a>
            </Button>
          ) : null}
          {row.owner_id !== workspace.data?.user.id ? (
            <Button
              size="sm"
              variant="outline"
              className="pop-press"
              onClick={() => claim.mutate()}
            >
              <User className="size-4" /> Assign to me
            </Button>
          ) : null}
          {row.status === "new" ? (
            <Button
              size="sm"
              variant="outline"
              className="pop-press"
              onClick={() => setStatus.mutate("contacted")}
            >
              <CheckCircle2 className="size-4" /> Mark contacted
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border p-5">
            <h3 className="font-display text-xl">Enquiry</h3>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ["Email", row.email],
                ["Phone", row.phone],
                ["Company", row.company],
                ["Interest", row.interest],
                ["Budget", row.budget ? String(row.budget) : null],
                ["Source", row.source],
                ["Campaign", row.utm_campaign],
                ["Reference", row.reference],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
                  <dd className="text-sm">{value || "—"}</dd>
                </div>
              ))}
            </dl>
            {row.message ? (
              <p className="mt-4 whitespace-pre-wrap rounded-xl bg-muted/60 p-4 text-sm">
                {row.message}
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border p-5">
            <h3 className="font-display text-xl">Timeline</h3>
            <ol className="mt-4 space-y-4">
              {(timeline.data ?? []).map((entry) => {
                const system = entry.type.startsWith("system");
                return (
                  <li key={entry.id} className="flex gap-3">
                    <span
                      className={`mt-1 flex size-7 shrink-0 items-center justify-center rounded-full ${system ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"}`}
                    >
                      {system ? <Bot className="size-3.5" /> : <User className="size-3.5" />}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{entry.title}</p>
                      {entry.body ? (
                        <p className="text-sm text-muted-foreground">{entry.body}</p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        {system ? "Tend" : "Team"} · {new Date(entry.created_at).toLocaleString()}
                      </p>
                    </div>
                  </li>
                );
              })}
              {(timeline.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
              ) : null}
            </ol>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border p-5">
            <h3 className="font-display text-xl">Qualification score</h3>
            <p
              className={`mt-3 inline-flex rounded-full px-4 py-1.5 text-sm font-semibold capitalize score-${row.score_band}`}
            >
              {row.score} · {row.score_band}
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {reasons.map((reason, index) => (
                <li key={index} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">{reason.label}</span>
                  <span className="font-medium">
                    {reason.points > 0 ? `+${reason.points}` : reason.points}
                  </span>
                </li>
              ))}
              {reasons.length === 0 ? (
                <li className="text-muted-foreground">No scoring rules matched.</li>
              ) : null}
            </ul>
          </section>

          <section className="rounded-2xl border p-5">
            <h3 className="font-display text-xl">Status</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {statusFlow.map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={row.status === status ? "default" : "outline"}
                  className="pop-press capitalize"
                  onClick={() => setStatus.mutate(status)}
                >
                  {status}
                </Button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border p-5">
            <h3 className="font-display text-xl">Follow-ups</h3>
            <ul className="mt-3 space-y-3 text-sm">
              {(tasks.data ?? []).map((task) => (
                <li key={task.id}>
                  <p className="font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {task.due_at ? `Due ${new Date(task.due_at).toLocaleString()}` : "No due date"}{" "}
                    · {task.status}
                  </p>
                </li>
              ))}
              {(tasks.data ?? []).length === 0 ? (
                <li className="text-muted-foreground">No follow-ups yet.</li>
              ) : null}
            </ul>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
