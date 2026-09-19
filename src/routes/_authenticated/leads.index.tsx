import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { AppShell, useWorkspace } from "@/components/beconlane/app-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/leads/")({
  head: () => ({
    meta: [
      { title: "Leads | Poppy" },
      { name: "description", content: "Every enquiry in one place, scored and sorted by what needs attention." },
      { property: "og:title", content: "Leads | Poppy" },
      { property: "og:description", content: "Every enquiry in one place, scored and sorted." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LeadsPage,
});

const statuses = ["all", "new", "contacted", "qualified", "proposal", "won", "lost", "disqualified"] as const;
const bands = ["all", "hot", "qualified", "warm", "cold"] as const;

export function bandClass(band: string) {
  return `score-${band}`;
}

function LeadsPage() {
  const workspace = useWorkspace();
  const workspaceId = workspace.data?.workspace?.id;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [band, setBand] = useState<string>("all");

  const leads = useQuery({
    queryKey: ["leads", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, full_name, email, company, score, score_band, status, source, created_at, owner_id, reference")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (leads.data ?? []).filter((lead) => {
      if (status !== "all" && lead.status !== status) return false;
      if (band !== "all" && lead.score_band !== band) return false;
      if (!term) return true;
      return [lead.full_name, lead.email, lead.company, lead.reference]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [leads.data, search, status, band]);

  return (
    <AppShell title="Leads">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:max-w-sm md:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search name, email or company"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search leads"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {bands.map((b) => (
            <Button key={b} size="sm" variant={band === b ? "default" : "outline"} className="pop-press capitalize" onClick={() => setBand(b)}>
              {b}
            </Button>
          ))}
        </div>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm capitalize md:ml-auto"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All statuses" : s}
            </option>
          ))}
        </select>
      </div>

      {leads.isLoading ? (
        <p className="text-muted-foreground">Loading leads…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed p-12 text-center">
          <Users className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-4 font-display text-2xl">Your pipeline is clear</h2>
          <p className="mt-1 text-muted-foreground">New opportunities will pop up here as soon as a form is submitted.</p>
          <Button asChild className="pop-press mt-5">
            <Link to="/forms">Share a form</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Score</th>
                <th className="hidden px-4 py-3 md:table-cell">Status</th>
                <th className="hidden px-4 py-3 md:table-cell">Source</th>
                <th className="hidden px-4 py-3 lg:table-cell">Received</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr key={lead.id} className="border-t hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <Link to="/leads/$leadId" params={{ leadId: lead.id }} className="font-medium hover:underline">
                      {lead.full_name || lead.email || "Unnamed enquiry"}
                    </Link>
                    <p className="text-xs text-muted-foreground">{lead.company || lead.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold capitalize ${bandClass(lead.score_band)}`}>
                      {lead.score} · {lead.score_band}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 capitalize md:table-cell">{lead.status}</td>
                  <td className="hidden px-4 py-3 capitalize md:table-cell">{lead.source}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
