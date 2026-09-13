import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock3, Flame, Plus, Users } from "lucide-react";
import { AppShell, useWorkspace } from "@/components/beconlane/app-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [
    { title: "Lead overview | Poppy" }, { name: "description", content: "Your lead pipeline, follow-ups, and recent activity." },
    { property: "og:title", content: "Lead overview | Poppy" }, { property: "og:description", content: "Your lead pipeline, follow-ups, and recent activity." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: Dashboard,
});

function Dashboard() {
  const workspace = useWorkspace();
  const workspaceId = workspace.data?.workspace?.id;
  const summary = useQuery({ queryKey: ["summary", workspaceId], enabled: Boolean(workspaceId), queryFn: async () => {
    const [leads, tasks] = await Promise.all([
      supabase.from("leads").select("id, full_name, company, score, score_band, status, created_at").eq("workspace_id", workspaceId ?? "").order("created_at", { ascending: false }).limit(6),
      supabase.from("tasks").select("id, status, due_at").eq("workspace_id", workspaceId ?? "").neq("status", "done"),
    ]);
    if (leads.error) throw leads.error; if (tasks.error) throw tasks.error;
    return { leads: leads.data ?? [], tasks: tasks.data ?? [] };
  }});

  if (!workspace.isLoading && !workspace.data?.workspace) return <WorkspaceSetup />;
  const leads = summary.data?.leads ?? [];
  const overdue = (summary.data?.tasks ?? []).filter((task) => task.due_at && new Date(task.due_at) < new Date()).length;
  const stats = [
    { label: "Total leads", value: leads.length, icon: Users },
    { label: "Hot leads", value: leads.filter((lead) => lead.score_band === "hot").length, icon: Flame },
    { label: "Open follow-ups", value: summary.data?.tasks.length ?? 0, icon: Clock3 },
    { label: "Overdue", value: overdue, icon: Clock3 },
  ];
  return <AppShell title="Overview" action={<Button asChild><Link to="/forms"><Plus />New form</Link></Button>}>
    <div className="mb-8"><p className="text-sm text-muted-foreground">A live view of your lead flow and what needs attention.</p></div>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-lg border bg-card p-5"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{label}</p><Icon className="size-4 text-primary" /></div><p className="mt-4 text-3xl font-semibold">{value}</p></div>)}</section>
    <section className="mt-8 overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b p-5"><div><h2 className="font-display text-2xl">Recent leads</h2><p className="mt-1 text-sm text-muted-foreground">Newest enquiries across your forms</p></div><Button variant="ghost" asChild><Link to="/leads">View all <ArrowRight /></Link></Button></div>
      {leads.length === 0 ? <div className="px-5 py-16 text-center"><span className="mx-auto flex size-11 items-center justify-center rounded-full bg-accent"><Users className="size-5 text-primary" /></span><h3 className="mt-4 font-semibold">No leads yet</h3><p className="mt-1 text-sm text-muted-foreground">Publish a form to start collecting enquiries.</p><Button className="mt-5" asChild><Link to="/forms"><Plus />Create a form</Link></Button></div> : <div className="divide-y">{leads.map((lead) => <Link key={lead.id} to="/leads/$leadId" params={{ leadId: lead.id }} className="grid grid-cols-[1fr_auto] items-center gap-4 p-4 hover:bg-muted/50 md:grid-cols-[1.3fr_1fr_100px_100px]"><div><p className="font-medium">{lead.full_name || "Unnamed lead"}</p><p className="text-xs text-muted-foreground">{lead.company || "No company"}</p></div><span className="hidden text-sm capitalize md:block">{lead.status}</span><span className="hidden text-sm font-semibold md:block">{lead.score} pts</span><span className={`rounded-full px-2.5 py-1 text-center text-xs font-semibold score-${lead.score_band}`}>{lead.score_band}</span></Link>)}</div>}
    </section>
  </AppShell>;
}

function WorkspaceSetup() {
  const workspace = useWorkspace();
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const { data: userData } = await supabase.auth.getUser(); if (!userData.user) return;
    const { error } = await supabase.from("workspaces").insert({ name: String(form.get("name")), timezone: String(form.get("timezone")), currency: String(form.get("currency")), created_by: userData.user.id });
    if (!error) await workspace.refetch();
  };
  return <main className="flex min-h-screen items-center justify-center bg-muted/40 p-5"><div className="w-full max-w-lg rounded-lg border bg-card p-6 sm:p-8"><p className="text-sm font-semibold text-primary">One last step</p><h1 className="mt-2 font-display text-4xl">Create your workspace</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">This keeps your forms, leads, and teammates together.</p><form onSubmit={submit} className="mt-8 space-y-5"><label className="block text-sm font-medium">Workspace name<input name="name" required minLength={2} className="mt-2 h-10 w-full rounded-md border bg-background px-3" placeholder="Acme Sales" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Timezone<select name="timezone" className="mt-2 h-10 w-full rounded-md border bg-background px-3"><option value="Asia/Jakarta">Jakarta</option><option value="UTC">UTC</option><option value="Europe/London">London</option><option value="America/New_York">New York</option></select></label><label className="block text-sm font-medium">Currency<select name="currency" className="mt-2 h-10 w-full rounded-md border bg-background px-3"><option value="IDR">IDR</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option></select></label></div><Button className="h-11 w-full">Create workspace <ArrowRight /></Button></form></div></main>;
}
