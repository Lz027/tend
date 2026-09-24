import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, ClipboardList, Clock } from "lucide-react";
import { toast } from "sonner";
import { AppShell, useWorkspace } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks | Tend" },
      {
        name: "description",
        content:
          "Every follow-up Tend created, with the promised response window front and centre.",
      },
      { property: "og:title", content: "Tasks | Tend" },
      { property: "og:description", content: "Follow-ups and response windows for your leads." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TasksPage,
});

const filters = ["open", "done", "all"] as const;

function dueLabel(due: string | null) {
  if (!due) return { text: "No deadline", overdue: false };
  const diff = new Date(due).getTime() - Date.now();
  const overdue = diff < 0;
  const mins = Math.round(Math.abs(diff) / 60000);
  const text =
    mins < 60
      ? `${mins} min`
      : mins < 1440
        ? `${Math.round(mins / 60)} h`
        : `${Math.round(mins / 1440)} d`;
  return { text: overdue ? `${text} overdue` : `due in ${text}`, overdue };
}

function TasksPage() {
  const workspace = useWorkspace();
  const workspaceId = workspace.data?.workspace?.id;
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<(typeof filters)[number]>("open");

  const tasks = useQuery({
    queryKey: ["tasks", workspaceId, filter],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select(
          "id, title, description, status, priority, type, due_at, lead_id, leads(full_name, email, score, score_band)",
        )
        .eq("workspace_id", workspaceId!)
        .order("due_at", { ascending: true })
        .limit(200);
      if (filter === "open") query = query.in("status", ["open", "in_progress"]);
      if (filter === "done") query = query.eq("status", "done");
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const complete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "done", completed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nice — task ticked off");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <AppShell title="Tasks">
      <div className="mb-6 flex flex-wrap gap-2">
        {filters.map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            className="pop-press capitalize"
            onClick={() => setFilter(f)}
          >
            {f}
          </Button>
        ))}
      </div>

      {tasks.isLoading ? (
        <p className="text-muted-foreground">Loading tasks…</p>
      ) : (tasks.data ?? []).length === 0 ? (
        <div className="rounded-3xl border border-dashed p-12 text-center">
          <ClipboardList className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-4 font-display text-2xl">Nothing waiting on you</h2>
          <p className="mt-1 text-muted-foreground">
            Tend adds a follow-up here every time a new enquiry lands.
          </p>
          <Button asChild className="pop-press mt-5">
            <Link to="/leads">See your leads</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {(tasks.data ?? []).map((task) => {
            const due = dueLabel(task.due_at);
            const lead = task.leads as {
              full_name: string | null;
              email: string | null;
              score: number;
              score_band: string;
            } | null;
            return (
              <li
                key={task.id}
                className="flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{task.title}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {lead ? lead.full_name || lead.email : "No linked lead"}
                    {task.description ? ` · ${task.description}` : ""}
                  </p>
                </div>
                {lead ? (
                  <span
                    className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold capitalize score-${lead.score_band}`}
                  >
                    {lead.score} · {lead.score_band}
                  </span>
                ) : null}
                <span
                  className={`inline-flex w-fit items-center gap-1 text-xs font-medium ${due.overdue ? "text-destructive" : "text-muted-foreground"}`}
                >
                  <Clock className="size-3.5" />
                  {due.text}
                </span>
                <div className="flex gap-2">
                  {task.lead_id ? (
                    <Button asChild size="sm" variant="outline" className="pop-press">
                      <Link to="/leads/$leadId" params={{ leadId: task.lead_id }}>
                        Open lead
                      </Link>
                    </Button>
                  ) : null}
                  {task.status !== "done" ? (
                    <Button
                      size="sm"
                      className="pop-press"
                      onClick={() => complete.mutate(task.id)}
                      disabled={complete.isPending}
                    >
                      <CheckCircle2 className="size-4" /> Done
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
