import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Flower2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/f/$slug")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Start your project enquiry | Tend" },
      {
        name: "description",
        content: "Tell us about your project and we will reply with clear next steps.",
      },
      { property: "og:title", content: "Start your project enquiry" },
      {
        property: "og:description",
        content: "Tell us about your project and we will reply with clear next steps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PublicFormPage,
});

interface FormField {
  id: string;
  type: string;
  label: string;
  key?: string;
  required?: boolean;
  options?: string[];
  order?: number;
}

const longText = new Set(["message"]);

function captureMeta() {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_term: params.get("utm_term"),
    utm_content: params.get("utm_content"),
    referrer: document.referrer || null,
    landing_page: window.location.href,
    device_type: window.innerWidth < 768 ? "mobile" : "desktop",
  };
}

function PublicFormPage() {
  const { slug } = Route.useParams();
  const [form, setForm] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("forms")
        .select(
          "id, name, description, fields, submit_text, success_message, consent_required, consent_text, is_active",
        )
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (!cancelled) {
        setForm(data as Record<string, unknown> | null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const fields = ((form?.["fields"] as FormField[] | undefined) ?? [])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const standard: Record<string, string> = {};
    const custom: Record<string, string> = {};
    for (const field of fields) {
      const value = values[field.id] ?? "";
      if (field.type.startsWith("custom_")) custom[field.key || field.label] = value;
      else standard[field.type] = value;
    }

    try {
      const response = await fetch(`/api/public/forms/${slug}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          values: standard,
          custom,
          consent,
          company_website: honeypot,
          meta: captureMeta(),
          idempotency_key: idempotencyKey,
        }),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        redirect_url?: string | null;
      };
      if (!response.ok || result.error) {
        setError(result.error ?? "Something went wrong. Please try again.");
      } else if (result.redirect_url) {
        window.location.href = result.redirect_url;
      } else {
        setDone(result.message ?? "Thanks — we will be in touch soon.");
      }
    } catch {
      setError("We could not send that. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/40">
        <Loader2 className="size-6 animate-spin text-primary" />
      </main>
    );
  }

  if (!form) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6 text-center">
        <div>
          <h1 className="font-display text-3xl">This form has closed</h1>
          <p className="mt-2 text-muted-foreground">
            The link may have changed. Please get in touch directly.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted/40 px-4 py-10">
      <div className="mx-auto w-full max-w-xl rounded-3xl border bg-card p-6 shadow-sm md:p-10">
        <div className="mb-6 flex items-center gap-2 text-primary">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Flower2 className="size-4" />
          </span>
          <span className="font-display text-xl">{String(form["name"])}</span>
        </div>

        {done ? (
          <div className="rounded-2xl bg-accent/20 p-6 text-center">
            <h2 className="font-display text-2xl">All set</h2>
            <p className="mt-2 text-muted-foreground">{done}</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            {form["description"] ? (
              <p className="text-muted-foreground">{String(form["description"])}</p>
            ) : null}

            {fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id}>
                  {field.label}
                  {field.required ? <span className="text-destructive"> *</span> : null}
                </Label>
                {field.type === "custom_checkbox" ? (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={field.id}
                      checked={values[field.id] === "yes"}
                      onCheckedChange={(checked) =>
                        setValues((prev) => ({ ...prev, [field.id]: checked ? "yes" : "no" }))
                      }
                    />
                    <span className="text-sm text-muted-foreground">Yes</span>
                  </div>
                ) : field.type === "custom_select" ? (
                  <select
                    id={field.id}
                    required={field.required}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={values[field.id] ?? ""}
                    onChange={(e) => setValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                  >
                    <option value="">Choose one</option>
                    {(field.options ?? []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : longText.has(field.type) ? (
                  <Textarea
                    id={field.id}
                    rows={5}
                    required={field.required}
                    value={values[field.id] ?? ""}
                    onChange={(e) => setValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                  />
                ) : (
                  <Input
                    id={field.id}
                    type={
                      field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"
                    }
                    required={field.required}
                    value={values[field.id] ?? ""}
                    onChange={(e) => setValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                  />
                )}
              </div>
            ))}

            <div className="hidden" aria-hidden>
              <label htmlFor="company_website">Company website</label>
              <input
                id="company_website"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            {form["consent_required"] ? (
              <label className="flex items-start gap-3 rounded-2xl bg-muted/60 p-4 text-sm">
                <Checkbox checked={consent} onCheckedChange={(c) => setConsent(Boolean(c))} />
                <span>{String(form["consent_text"])}</span>
              </label>
            ) : null}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button type="submit" className="pop-press w-full" disabled={submitting}>
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                String(form["submit_text"] ?? "Submit")
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">Powered by Tend</p>
          </form>
        )}
      </div>
    </main>
  );
}
