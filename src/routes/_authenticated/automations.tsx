import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Copy, Send } from "lucide-react";
import { toast } from "sonner";
import { AppShell, useWorkspace } from "@/components/beconlane/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { sendTestEvent } from "@/lib/automations.functions";

export const Route = createFileRoute("/_authenticated/automations")({
  head: () => ({
    meta: [
      { title: "Automations | Poppy" },
      { name: "description", content: "Send leads into Poppy from anywhere, and push Poppy events out to Make, n8n or Zapier." },
      { property: "og:title", content: "Automations | Poppy" },
      { property: "og:description", content: "Inbound links and signed outbound events for your lead workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AutomationsPage,
});

const EVENTS = ["lead.created", "lead.updated", "lead.status_changed", "task.created", "task.completed"];

function randomToken(length = 32) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function AutomationsPage() {
  const workspace = useWorkspace();
  const workspaceId = workspace.data?.workspace?.id;
  const userId = workspace.data?.user.id;
  const queryClient = useQueryClient();
  const runTestEvent = useServerFn(sendTestEvent);

  const [sourceName, setSourceName] = useState("");
  const [endpoint, setEndpoint] = useState({ name: "", url: "", provider: "make" });
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  const data = useQuery({
    queryKey: ["automations", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const [sources, endpoints, deliveries] = await Promise.all([
        supabase.from("automation_sources").select("*").eq("workspace_id", workspaceId!).order("created_at", { ascending: false }),
        supabase.from("automation_endpoints").select("*").eq("workspace_id", workspaceId!).order("created_at", { ascending: false }),
        supabase.from("automation_deliveries").select("id, event_type, status, response_status, created_at").eq("workspace_id", workspaceId!).order("created_at", { ascending: false }).limit(15),
      ]);
      if (sources.error) throw sources.error;
      if (endpoints.error) throw endpoints.error;
      if (deliveries.error) throw deliveries.error;
      return { sources: sources.data, endpoints: endpoints.data, deliveries: deliveries.data };
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["automations"] });

  const createSource = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("automation_sources").insert({
        workspace_id: workspaceId!,
        created_by: userId ?? null,
        name: sourceName.trim() || "Incoming leads",
        provider: "api",
        token: randomToken(),
        field_mapping: {},
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSourceName("");
      toast.success("Incoming link ready");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const createEndpoint = useMutation({
    mutationFn: async () => {
      if (!endpoint.url.startsWith("https://")) throw new Error("The address must start with https://");
      const { error } = await supabase.from("automation_endpoints").insert({
        workspace_id: workspaceId!,
        created_by: userId ?? null,
        name: endpoint.name.trim() || "My automation",
        url: endpoint.url.trim(),
        provider: endpoint.provider,
        secret: randomToken(24),
        subscribed_events: ["lead.created"],
        included_fields: [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setEndpoint({ name: "", url: "", provider: "make" });
      toast.success("Outgoing connection saved");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleRow = useMutation({
    mutationFn: async ({ table, id, active }: { table: "automation_sources" | "automation_endpoints"; id: string; active: boolean }) => {
      const { error } = await supabase.from(table).update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  const test = useMutation({
    mutationFn: async (endpointId: string) => runTestEvent({ data: { endpointId } }),
    onSuccess: (result) => {
      if (result.ok) toast.success(`Test event delivered (${result.status})`);
      else toast.error(`Test event failed${result.status ? ` (${result.status})` : ""}`);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success("Copied");
  };

  const toggleEvent = async (id: string, current: string[], event: string) => {
    const next = current.includes(event) ? current.filter((e) => e !== event) : [...current, event];
    const { error } = await supabase.from("automation_endpoints").update({ subscribed_events: next }).eq("id", id);
    if (error) toast.error(error.message);
    else invalidate();
  };

  return (
    <AppShell title="Automations">
      <p className="mb-6 max-w-2xl text-muted-foreground">
        Poppy keeps the lead record, the scoring and the follow-ups. Your other tools just send leads in and listen for what happens next.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border p-5">
          <h2 className="flex items-center gap-2 font-display text-2xl"><ArrowDownToLine className="size-5 text-primary" /> Leads coming in</h2>
          <p className="mb-4 text-sm text-muted-foreground">Create a link, then POST JSON to it from Make, n8n, Zapier or your own script.</p>

          <div className="flex gap-2">
            <Input value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="Name this source" aria-label="Source name" />
            <Button className="pop-press" onClick={() => createSource.mutate()} disabled={createSource.isPending}>Create link</Button>
          </div>

          <ul className="mt-4 space-y-3">
            {(data.data?.sources ?? []).map((source) => (
              <li key={source.id} className="rounded-xl border p-3">
                <div className="flex items-center gap-3">
                  <p className="min-w-0 flex-1 truncate font-medium">{source.name}</p>
                  <Switch checked={source.is_active} aria-label={`Toggle ${source.name}`} onCheckedChange={(active) => toggleRow.mutate({ table: "automation_sources", id: source.id, active })} />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{`${origin}/api/public/intake/${source.token}`}</code>
                  <Button size="icon" variant="ghost" aria-label="Copy link" onClick={() => copy(`${origin}/api/public/intake/${source.token}`)}><Copy className="size-4" /></Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {source.received_count} received{source.error_count ? ` · ${source.error_count} rejected` : ""}
                  {source.last_error ? ` · last problem: ${source.last_error}` : ""}
                </p>
              </li>
            ))}
            {(data.data?.sources ?? []).length === 0 && !data.isLoading ? (
              <li className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                No incoming links yet. Send fields like name, email, phone, company, budget and message.
              </li>
            ) : null}
          </ul>
        </section>

        <section className="rounded-2xl border p-5">
          <h2 className="flex items-center gap-2 font-display text-2xl"><ArrowUpFromLine className="size-5 text-primary" /> Events going out</h2>
          <p className="mb-4 text-sm text-muted-foreground">Poppy posts signed JSON to your automation whenever something happens.</p>

          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label htmlFor="endpoint-name" className="text-xs">Name</Label>
              <Input id="endpoint-name" value={endpoint.name} onChange={(e) => setEndpoint({ ...endpoint, name: e.target.value })} placeholder="Slack alert" />
            </div>
            <div>
              <Label htmlFor="endpoint-provider" className="text-xs">Tool</Label>
              <select id="endpoint-provider" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={endpoint.provider} onChange={(e) => setEndpoint({ ...endpoint, provider: e.target.value })}>
                <option value="make">Make</option>
                <option value="n8n">n8n</option>
                <option value="zapier">Zapier</option>
                <option value="custom">Something else</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="endpoint-url" className="text-xs">Address</Label>
              <Input id="endpoint-url" value={endpoint.url} onChange={(e) => setEndpoint({ ...endpoint, url: e.target.value })} placeholder="https://hook.eu2.make.com/..." />
            </div>
          </div>
          <Button className="pop-press mt-3" onClick={() => createEndpoint.mutate()} disabled={createEndpoint.isPending}>Save connection</Button>

          <ul className="mt-4 space-y-3">
            {(data.data?.endpoints ?? []).map((item) => (
              <li key={item.id} className="rounded-xl border p-3">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.url}</p>
                  </div>
                  <Button size="sm" variant="outline" className="pop-press" onClick={() => test.mutate(item.id)} disabled={test.isPending}>
                    <Send className="size-4" /> Test
                  </Button>
                  <Switch checked={item.is_active} aria-label={`Toggle ${item.name}`} onCheckedChange={(active) => toggleRow.mutate({ table: "automation_endpoints", id: item.id, active })} />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {EVENTS.map((event) => {
                    const on = item.subscribed_events.includes(event);
                    return (
                      <button
                        key={event}
                        type="button"
                        onClick={() => toggleEvent(item.id, item.subscribed_events, event)}
                        className={`rounded-full border px-2.5 py-1 text-xs ${on ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}
                      >
                        {event}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Signing secret</span>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => copy(item.secret)}>Copy</Button>
                </div>
              </li>
            ))}
            {(data.data?.endpoints ?? []).length === 0 && !data.isLoading ? (
              <li className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                Nothing connected yet. Paste a webhook address from Make, n8n or Zapier.
              </li>
            ) : null}
          </ul>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border p-5">
        <h2 className="font-display text-2xl">Recent deliveries</h2>
        {(data.data?.deliveries ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No events have been sent yet.</p>
        ) : (
          <ul className="mt-3 divide-y text-sm">
            {(data.data?.deliveries ?? []).map((delivery) => (
              <li key={delivery.id} className="flex items-center gap-3 py-2">
                <span className="font-medium">{delivery.event_type}</span>
                <span className={delivery.status === "delivered" ? "text-primary" : "text-destructive"}>{delivery.status}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {delivery.response_status ?? "—"} · {new Date(delivery.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
