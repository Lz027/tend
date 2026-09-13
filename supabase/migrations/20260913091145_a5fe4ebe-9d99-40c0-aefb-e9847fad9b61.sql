
-- Lead enrichment -----------------------------------------------------------
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS email_normalized text,
  ADD COLUMN IF NOT EXISTS phone_normalized text,
  ADD COLUMN IF NOT EXISTS first_touch_source text,
  ADD COLUMN IF NOT EXISTS last_touch_source text,
  ADD COLUMN IF NOT EXISTS engagement_state text NOT NULL DEFAULT 'on_track',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS first_contacted_at timestamptz;

CREATE OR REPLACE FUNCTION public.normalize_lead_contact()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.email_normalized := NULLIF(lower(trim(NEW.email)), '');
  NEW.phone_normalized := NULLIF(regexp_replace(COALESCE(NEW.phone, ''), '[^0-9]', '', 'g'), '');
  IF NEW.first_touch_source IS NULL THEN
    NEW.first_touch_source := COALESCE(NEW.utm_source, NEW.source);
  END IF;
  NEW.last_touch_source := COALESCE(NEW.utm_source, NEW.source, NEW.last_touch_source);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_normalize ON public.leads;
CREATE TRIGGER leads_normalize BEFORE INSERT OR UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.normalize_lead_contact();

UPDATE public.leads SET updated_at = updated_at;

CREATE INDEX IF NOT EXISTS leads_email_norm_idx ON public.leads (workspace_id, email_normalized);
CREATE INDEX IF NOT EXISTS leads_phone_norm_idx ON public.leads (workspace_id, phone_normalized);

-- Consent -------------------------------------------------------------------
ALTER TABLE public.consent_records
  ADD COLUMN IF NOT EXISTS consent_version text NOT NULL DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'enquiry_follow_up';

-- Tasks / SLA ----------------------------------------------------------------
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS sla_minutes integer,
  ADD COLUMN IF NOT EXISTS owner_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_notified_at timestamptz;

-- Saved views ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_shared boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_views TO authenticated;
GRANT ALL ON public.saved_views TO service_role;
ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved views read" ON public.saved_views FOR SELECT TO authenticated
  USING (private.is_member(workspace_id, auth.uid()));
CREATE POLICY "saved views insert" ON public.saved_views FOR INSERT TO authenticated
  WITH CHECK (private.is_member(workspace_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY "saved views update" ON public.saved_views FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND private.is_member(workspace_id, auth.uid()));
CREATE POLICY "saved views delete" ON public.saved_views FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR private.is_admin(workspace_id, auth.uid()));
CREATE TRIGGER saved_views_updated BEFORE UPDATE ON public.saved_views
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Inbound automation sources --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.automation_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  provider text NOT NULL DEFAULT 'custom',
  token text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  field_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  sample_payload jsonb,
  last_received_at timestamptz,
  received_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  last_error text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_sources TO authenticated;
GRANT ALL ON public.automation_sources TO service_role;
ALTER TABLE public.automation_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sources read" ON public.automation_sources FOR SELECT TO authenticated
  USING (private.is_member(workspace_id, auth.uid()));
CREATE POLICY "sources insert" ON public.automation_sources FOR INSERT TO authenticated
  WITH CHECK (private.can_edit(workspace_id, auth.uid()));
CREATE POLICY "sources update" ON public.automation_sources FOR UPDATE TO authenticated
  USING (private.can_edit(workspace_id, auth.uid()));
CREATE POLICY "sources delete" ON public.automation_sources FOR DELETE TO authenticated
  USING (private.is_admin(workspace_id, auth.uid()));
CREATE TRIGGER automation_sources_updated BEFORE UPDATE ON public.automation_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Outbound endpoints ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.automation_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  provider text NOT NULL DEFAULT 'custom',
  url text NOT NULL,
  secret text NOT NULL,
  subscribed_events text[] NOT NULL DEFAULT ARRAY['lead.created','lead.qualified'],
  included_fields text[] NOT NULL DEFAULT ARRAY['id','full_name','email','company','score','score_band','status','source'],
  is_active boolean NOT NULL DEFAULT true,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  consecutive_failures integer NOT NULL DEFAULT 0,
  avg_response_ms integer,
  delivery_count integer NOT NULL DEFAULT 0,
  failure_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_endpoints TO authenticated;
GRANT ALL ON public.automation_endpoints TO service_role;
ALTER TABLE public.automation_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "endpoints read" ON public.automation_endpoints FOR SELECT TO authenticated
  USING (private.is_member(workspace_id, auth.uid()));
CREATE POLICY "endpoints insert" ON public.automation_endpoints FOR INSERT TO authenticated
  WITH CHECK (private.can_edit(workspace_id, auth.uid()));
CREATE POLICY "endpoints update" ON public.automation_endpoints FOR UPDATE TO authenticated
  USING (private.can_edit(workspace_id, auth.uid()));
CREATE POLICY "endpoints delete" ON public.automation_endpoints FOR DELETE TO authenticated
  USING (private.is_admin(workspace_id, auth.uid()));
CREATE TRIGGER automation_endpoints_updated BEFORE UPDATE ON public.automation_endpoints
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Events ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.automation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type text NOT NULL,
  resource_type text NOT NULL DEFAULT 'lead',
  resource_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS automation_events_idem_idx
  ON public.automation_events (workspace_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
GRANT SELECT ON public.automation_events TO authenticated;
GRANT ALL ON public.automation_events TO service_role;
ALTER TABLE public.automation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events read" ON public.automation_events FOR SELECT TO authenticated
  USING (private.is_member(workspace_id, auth.uid()));

-- Deliveries --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.automation_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  endpoint_id uuid NOT NULL REFERENCES public.automation_endpoints(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.automation_events(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  attempt_count integer NOT NULL DEFAULT 0,
  response_status integer,
  response_body_preview text,
  duration_ms integer,
  next_retry_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS deliveries_pending_idx
  ON public.automation_deliveries (status, next_retry_at);
CREATE INDEX IF NOT EXISTS deliveries_workspace_idx
  ON public.automation_deliveries (workspace_id, created_at DESC);
GRANT SELECT ON public.automation_deliveries TO authenticated;
GRANT ALL ON public.automation_deliveries TO service_role;
ALTER TABLE public.automation_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deliveries read" ON public.automation_deliveries FOR SELECT TO authenticated
  USING (private.is_member(workspace_id, auth.uid()));
CREATE TRIGGER automation_deliveries_updated BEFORE UPDATE ON public.automation_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
