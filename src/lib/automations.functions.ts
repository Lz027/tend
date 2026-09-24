import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Sends a signed sample event to one endpoint so people can wire up Make/n8n/Zapier. */
export const sendTestEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ endpointId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: endpoint, error } = await context.supabase
      .from("automation_endpoints")
      .select("id, workspace_id, url, secret, name")
      .eq("id", data.endpointId)
      .maybeSingle();

    if (error || !endpoint) throw new Error("That endpoint is no longer available.");

    const payload = {
      type: "lead.created",
      test: true,
      sent_at: new Date().toISOString(),
      data: {
        id: "00000000-0000-0000-0000-000000000000",
        full_name: "Test Lead",
        email: "test@example.com",
        company: "Tend Test",
        score: 82,
        score_band: "hot",
        status: "new",
        source: "form",
      },
    };

    const body = JSON.stringify(payload);
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(endpoint.secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sigBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const signature = Array.from(new Uint8Array(sigBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const started = Date.now();
    let status = 0;
    let preview = "";
    try {
      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-tend-event": "lead.created",
          "x-tend-signature": `sha256=${signature}`,
        },
        body,
      });
      status = response.status;
      preview = (await response.text()).slice(0, 500);
    } catch (err) {
      preview = err instanceof Error ? err.message : "Request failed";
    }

    const ok = status >= 200 && status < 300;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("automation_deliveries").insert({
      workspace_id: endpoint.workspace_id,
      endpoint_id: endpoint.id,
      event_type: "lead.created",
      status: ok ? "delivered" : "failed",
      attempt_count: 1,
      payload,
      response_status: status || null,
      response_body_preview: preview || null,
      duration_ms: Date.now() - started,
      delivered_at: ok ? new Date().toISOString() : null,
    });

    return { ok, status, preview };
  });
