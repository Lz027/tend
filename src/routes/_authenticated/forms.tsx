import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Copy, FileText, Plus } from "lucide-react";
import { AppShell, useWorkspace } from "@/components/beconlane/app-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/forms")({
  head: () => ({
    meta: [
      { title: "Forms | Poppy" },
      { name: "description", content: "Create and manage lead capture forms." },
      { property: "og:title", content: "Forms | Poppy" },
      { property: "og:description", content: "Create and manage lead capture forms." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FormsPage,
});

function FormsPage() {
  const workspace = useWorkspace();
  const workspaceId = workspace.data?.workspace?.id;
  const forms = useQuery({
    queryKey: ["forms", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forms")
        .select("id, name, slug, is_active, created_at")
        .eq("workspace_id", workspaceId ?? "")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const publicUrl = (slug: string) => `${window.location.origin}/f/${slug}`;

  return (
    <AppShell
      title="Forms"
      action={
        <Button asChild>
          <Link to="/forms/new">
            <Plus /> New form
          </Link>
        </Button>
      }
    >
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">
          Build hosted forms, copy the public link, or embed them on your site.
        </p>
      </div>
      {forms.data?.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-accent">
            <FileText className="size-5 text-primary" />
          </span>
          <h3 className="mt-4 font-semibold">No forms yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first form to start collecting leads.
          </p>
          <Button className="mt-5" asChild>
            <Link to="/forms/new">
              <Plus /> Create a form
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {forms.data?.map((form) => (
            <div key={form.id} className="rounded-lg border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{form.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">/{form.slug}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${form.is_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}
                >
                  {form.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="mt-5 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard.writeText(publicUrl(form.slug));
                  }}
                >
                  <Copy className="mr-1 size-3.5" /> Copy link
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <a href={publicUrl(form.slug)} target="_blank" rel="noreferrer">
                    Open <ArrowRight className="ml-1 size-3.5" />
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
