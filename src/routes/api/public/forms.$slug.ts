import { createFileRoute } from "@tanstack/react-router";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });

export const Route = createFileRoute("/api/public/forms/$slug")({
  server: {
    handlers: {
      OPTIONS: () =>
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type",
          },
        }),
      POST: async ({ request, params }) => {
        const raw = await request.text();
        if (raw.length > 100_000) return json({ error: "Payload too large." }, 413);

        let body: Record<string, unknown>;
        try {
          body = JSON.parse(raw || "{}");
        } catch {
          return json({ error: "Invalid request." }, 400);
        }

        // Honeypot — silently accept, store nothing.
        if (typeof body.company_website === "string" && body.company_website.trim() !== "") {
          return json({ ok: true });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { processLeadIntake } = await import("@/lib/lead-intake.server");

        const { data: form } = await supabaseAdmin
          .from("forms")
          .select("id, workspace_id, is_active, consent_required, consent_text, success_message, redirect_url")
          .eq("slug", params.slug)
          .maybeSingle();

        if (!form || !form.is_active) return json({ error: "This form is not accepting submissions." }, 404);

        const values = (body.values ?? {}) as Record<string, unknown>;
        const custom = (body.custom ?? {}) as Record<string, unknown>;
        const meta = (body.meta ?? {}) as Record<string, unknown>;
        const consentGranted = body.consent === true;

        if (form.consent_required && !consentGranted) {
          return json({ error: "Please accept the consent statement." }, 400);
        }

        try {
          const result = await processLeadIntake({
            workspaceId: form.workspace_id,
            formId: form.id,
            source: "form",
            values,
            custom,
            meta: meta as never,
            consent: form.consent_required || consentGranted
              ? { granted: consentGranted, text: form.consent_text, version: "1" }
              : null,
            idempotencyKey: typeof body.idempotency_key === "string" ? body.idempotency_key : null,
          });
          return json({
            ok: true,
            duplicate: result.duplicate,
            message: form.success_message,
            redirect_url: form.redirect_url,
          });
        } catch (error) {
          console.error("[form submit]", error);
          const message = error instanceof Error ? error.message : "Something went wrong.";
          return json({ error: message }, 400);
        }
      },
    },
  },
});
