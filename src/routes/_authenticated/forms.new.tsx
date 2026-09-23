import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, GripVertical, Plus, Trash2 } from "lucide-react";
import { AppShell, useWorkspace } from "@/components/beconlane/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/forms/new")({
  head: () => ({
    meta: [
      { title: "New form | Poppy" },
      { name: "description", content: "Create a new lead capture form." },
      { property: "og:title", content: "New form | Poppy" },
      { property: "og:description", content: "Create a new lead capture form." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewFormPage,
});

const standardFieldTypes = [
  { value: "name", label: "Full name" },
  { value: "email", label: "Email address" },
  { value: "phone", label: "Phone number" },
  { value: "company", label: "Company" },
  { value: "job_title", label: "Job title" },
  { value: "country", label: "Country" },
  { value: "interest", label: "Interest / product" },
  { value: "budget", label: "Budget" },
  { value: "message", label: "Message" },
  { value: "preferred_contact", label: "Preferred contact method" },
];

const customFieldTypes = [
  { value: "custom_text", label: "Custom text" },
  { value: "custom_select", label: "Custom select" },
  { value: "custom_checkbox", label: "Custom checkbox" },
];

interface FormField {
  id: string;
  type: string;
  label: string;
  key?: string;
  required: boolean;
  options: string[];
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function NewFormPage() {
  const navigate = useNavigate();
  const workspace = useWorkspace();
  const workspaceId = workspace.data?.workspace?.id;

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [submitText, setSubmitText] = useState("Submit");
  const [successMessage, setSuccessMessage] = useState("Thanks — we will be in touch soon.");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [consentRequired, setConsentRequired] = useState(false);
  const [consentText, setConsentText] = useState("I agree to be contacted about my enquiry.");
  const [isActive, setIsActive] = useState(true);
  const [fields, setFields] = useState<FormField[]>([
    { id: crypto.randomUUID(), type: "name", label: "Full name", required: true, options: [] },
    { id: crypto.randomUUID(), type: "email", label: "Email address", required: true, options: [] },
    { id: crypto.randomUUID(), type: "message", label: "Message", required: false, options: [] },
  ]);
  const [saving, setSaving] = useState(false);

  const addField = (type: string) => {
    const standard = standardFieldTypes.find((f) => f.value === type);
    const custom = customFieldTypes.find((f) => f.value === type);
    const label = standard?.label ?? custom?.label ?? "Field";
    setFields((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type,
        label,
        key: type.startsWith("custom_") ? `custom_${Date.now()}` : "",
        required: false,
        options: type === "custom_select" ? ["Option 1"] : [],
      },
    ]);
  };

  const updateField = (id: string, patch: Partial<FormField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeField = (id: string) => setFields((prev) => prev.filter((f) => f.id !== id));

  const moveField = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= fields.length) return;
    setFields((prev) => {
      const copy = [...prev];
      [copy[index], copy[next]] = [copy[next]!, copy[index]!];
      return copy;
    });
  };

  const save = async () => {
    if (!workspaceId) return toast.error("Set up your workspace first.");
    if (!name.trim()) return toast.error("Give the form a name.");
    if (!slug.trim()) return toast.error("Add a public link name.");
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setSaving(false);
      return toast.error("Please sign in again.");
    }

    const { error } = await supabase.from("forms").insert({
      workspace_id: workspaceId,
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim() || null,
      fields: fields.map((f, i) => ({
        id: f.id,
        type: f.type,
        label: f.label,
        key: f.key,
        required: f.required,
        options: f.options,
        order: i,
      })),
      submit_text: submitText,
      success_message: successMessage,
      redirect_url: redirectUrl.trim() || null,
      consent_required: consentRequired,
      consent_text: consentText,
      is_active: isActive,
      created_by: userData.user.id,
    });

    setSaving(false);
    if (!error) {
      void navigate({ to: "/forms" });
    }
  };

  return (
    <AppShell
      title="New form"
      action={
        <Button variant="outline" size="sm" asChild>
          <Link to="/forms">
            <ArrowLeft className="mr-1 size-4" /> Back to forms
          </Link>
        </Button>
      }
    >
      <div className="mx-auto max-w-3xl">
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-5">
            <h2 className="font-display text-xl">Form details</h2>
            <div className="mt-4 grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Form name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (slug === "" || slug === slugify(name)) setSlug(slugify(e.target.value));
                  }}
                  placeholder="e.g. Contact sales"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="slug">Public slug</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  placeholder="contact-sales"
                />
                <p className="text-xs text-muted-foreground">
                  Public URL will be {typeof window !== "undefined" ? window.location.origin : ""}/f/{slug || "your-slug"}
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Internal note about this form"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl">Fields</h2>
              <div className="flex gap-2">
                <select
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                  onChange={(e) => {
                    if (e.target.value) {
                      addField(e.target.value);
                      e.target.value = "";
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Add field
                  </option>
                  <optgroup label="Standard">
                    {standardFieldTypes.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Custom">
                    {customFieldTypes.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="rounded-md border p-4">
                  <div className="flex items-start gap-3">
                    <button
                      className="mt-2 text-muted-foreground hover:text-foreground"
                      aria-label="Reorder"
                    >
                      <GripVertical className="size-4" />
                    </button>
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <Input
                          value={field.label}
                          onChange={(e) => updateField(field.id, { label: e.target.value })}
                          className="flex-1"
                          placeholder="Label"
                        />
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`required-${field.id}`}
                            checked={field.required}
                            onCheckedChange={(checked) => updateField(field.id, { required: checked })}
                          />
                          <Label htmlFor={`required-${field.id}`} className="text-sm">
                            Required
                          </Label>
                        </div>
                      </div>
                      {field.type.startsWith("custom_") && (
                        <div className="grid gap-2">
                          <Label className="text-xs">Field key</Label>
                          <Input
                            value={field.key ?? ""}
                            onChange={(e) => updateField(field.id, { key: e.target.value })}
                            placeholder="custom_field_key"
                            className="text-sm"
                          />
                        </div>
                      )}
                      {field.type === "custom_select" && (
                        <div className="grid gap-2">
                          <Label className="text-xs">Options (one per line)</Label>
                          <Textarea
                            value={field.options.join("\n")}
                            onChange={(e) =>
                              updateField(field.id, {
                                options: e.target.value.split("\n").map((o) => o.trim()).filter(Boolean),
                              })
                            }
                            placeholder="Option 1&#10;Option 2"
                            className="text-sm"
                          />
                        </div>
                      )}
                    </div>
                    <div className="ml-2 flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveField(index, -1)}
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveField(index, 1)}
                        disabled={index === fields.length - 1}
                      >
                        ↓
                      </Button>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeField(field.id)} aria-label="Remove field">
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border bg-card p-5">
            <h2 className="font-display text-xl">Submission</h2>
            <div className="mt-4 grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="submitText">Submit button text</Label>
                <Input id="submitText" value={submitText} onChange={(e) => setSubmitText(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="successMessage">Success message</Label>
                <Input id="successMessage" value={successMessage} onChange={(e) => setSuccessMessage(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="redirectUrl">Redirect URL (optional)</Label>
                <Input id="redirectUrl" value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} placeholder="https://example.com/thanks" />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="consent" checked={consentRequired} onCheckedChange={setConsentRequired} />
                <Label htmlFor="consent">Require consent checkbox</Label>
              </div>
              {consentRequired && (
                <div className="grid gap-2">
                  <Label htmlFor="consentText">Consent wording</Label>
                  <Textarea id="consentText" value={consentText} onChange={(e) => setConsentText(e.target.value)} />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
                <Label htmlFor="active">Form is active</Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" asChild>
              <Link to="/forms">Cancel</Link>
            </Button>
            <Button onClick={save} disabled={saving || !name.trim() || !slug.trim()}>
              {saving ? "Saving…" : "Create form"}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
