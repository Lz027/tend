
-- ENUMS
CREATE TYPE public.workspace_role AS ENUM ('owner','admin','manager','member','viewer');
CREATE TYPE public.lead_status AS ENUM ('new','contacted','qualified','proposal','won','lost','disqualified');
CREATE TYPE public.score_band AS ENUM ('hot','warm','cold','disqualified');
CREATE TYPE public.task_type AS ENUM ('call','email','meeting','message','research','follow_up','other');
CREATE TYPE public.task_status AS ENUM ('open','in_progress','done','cancelled');
CREATE TYPE public.task_priority AS ENUM ('low','normal','high','urgent');
CREATE TYPE public.invitation_status AS ENUM ('pending','accepted','revoked');

-- UPDATED_AT
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- WORKSPACES
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  currency TEXT NOT NULL DEFAULT 'USD',
  round_robin_index INT NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- MEMBERSHIPS
CREATE TABLE public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.workspace_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memberships TO authenticated;
GRANT ALL ON public.memberships TO service_role;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- HELPERS
CREATE OR REPLACE FUNCTION public.is_member(_workspace UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.memberships m WHERE m.workspace_id = _workspace AND m.user_id = _user);
$$;

CREATE OR REPLACE FUNCTION public.member_role(_workspace UUID, _user UUID)
RETURNS public.workspace_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.role FROM public.memberships m WHERE m.workspace_id = _workspace AND m.user_id = _user;
$$;

CREATE OR REPLACE FUNCTION public.can_edit(_workspace UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.member_role(_workspace,_user) IN ('owner','admin','manager','member');
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_workspace UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.member_role(_workspace,_user) IN ('owner','admin');
$$;

-- PROFILES POLICIES
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles teammates read" ON public.profiles FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.memberships m1 JOIN public.memberships m2 ON m1.workspace_id = m2.workspace_id
          WHERE m1.user_id = auth.uid() AND m2.user_id = public.profiles.id)
);
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles self insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- WORKSPACE POLICIES
CREATE POLICY "workspaces read" ON public.workspaces FOR SELECT TO authenticated USING (public.is_member(id, auth.uid()));
CREATE POLICY "workspaces insert" ON public.workspaces FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "workspaces update" ON public.workspaces FOR UPDATE TO authenticated USING (public.is_admin(id, auth.uid()));
CREATE POLICY "workspaces delete" ON public.workspaces FOR DELETE TO authenticated USING (public.member_role(id, auth.uid()) = 'owner');

-- MEMBERSHIP POLICIES
CREATE POLICY "memberships read" ON public.memberships FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "memberships insert self bootstrap" ON public.memberships FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.created_by = auth.uid()));
CREATE POLICY "memberships admin insert" ON public.memberships FOR INSERT TO authenticated WITH CHECK (public.is_admin(workspace_id, auth.uid()));
CREATE POLICY "memberships admin update" ON public.memberships FOR UPDATE TO authenticated USING (public.is_admin(workspace_id, auth.uid()));
CREATE POLICY "memberships admin delete" ON public.memberships FOR DELETE TO authenticated USING (public.is_admin(workspace_id, auth.uid()));

-- INVITATIONS
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.workspace_role NOT NULL DEFAULT 'member',
  status public.invitation_status NOT NULL DEFAULT 'pending',
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18),'hex'),
  invited_by UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '14 days',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations TO authenticated;
GRANT ALL ON public.invitations TO service_role;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invitations read" ON public.invitations FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "invitations admin write" ON public.invitations FOR INSERT TO authenticated WITH CHECK (public.is_admin(workspace_id, auth.uid()) AND invited_by = auth.uid());
CREATE POLICY "invitations admin update" ON public.invitations FOR UPDATE TO authenticated USING (public.is_admin(workspace_id, auth.uid()));
CREATE POLICY "invitations admin delete" ON public.invitations FOR DELETE TO authenticated USING (public.is_admin(workspace_id, auth.uid()));

-- FORMS
CREATE TABLE public.forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  submit_text TEXT NOT NULL DEFAULT 'Submit',
  success_message TEXT NOT NULL DEFAULT 'Thanks — we''ll be in touch shortly.',
  redirect_url TEXT,
  consent_required BOOLEAN NOT NULL DEFAULT true,
  consent_text TEXT NOT NULL DEFAULT 'I agree to be contacted about my enquiry.',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forms TO authenticated;
GRANT SELECT ON public.forms TO anon;
GRANT ALL ON public.forms TO service_role;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forms member read" ON public.forms FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "forms public read" ON public.forms FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "forms admin insert" ON public.forms FOR INSERT TO authenticated WITH CHECK (public.can_edit(workspace_id, auth.uid()));
CREATE POLICY "forms admin update" ON public.forms FOR UPDATE TO authenticated USING (public.can_edit(workspace_id, auth.uid()));
CREATE POLICY "forms admin delete" ON public.forms FOR DELETE TO authenticated USING (public.is_admin(workspace_id, auth.uid()));
CREATE TRIGGER forms_updated BEFORE UPDATE ON public.forms FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- LEADS
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  reference TEXT NOT NULL DEFAULT upper(substr(encode(gen_random_bytes(4),'hex'),1,8)),
  full_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  job_title TEXT,
  country TEXT,
  interest TEXT,
  budget NUMERIC,
  message TEXT,
  preferred_contact TEXT,
  custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'form',
  form_id UUID REFERENCES public.forms(id) ON DELETE SET NULL,
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_term TEXT, utm_content TEXT,
  referrer TEXT, landing_page TEXT, device_type TEXT,
  score INT NOT NULL DEFAULT 0,
  score_band public.score_band NOT NULL DEFAULT 'cold',
  score_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  score_override INT,
  score_override_reason TEXT,
  status public.lead_status NOT NULL DEFAULT 'new',
  lost_reason TEXT,
  won_value NUMERIC,
  owner_id UUID,
  do_not_contact BOOLEAN NOT NULL DEFAULT false,
  is_duplicate BOOLEAN NOT NULL DEFAULT false,
  duplicate_of UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  submission_count INT NOT NULL DEFAULT 1,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX leads_workspace_idx ON public.leads(workspace_id, created_at DESC);
CREATE INDEX leads_email_idx ON public.leads(workspace_id, email);
CREATE INDEX leads_phone_idx ON public.leads(workspace_id, phone);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads read" ON public.leads FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "leads insert" ON public.leads FOR INSERT TO authenticated WITH CHECK (public.can_edit(workspace_id, auth.uid()));
CREATE POLICY "leads update" ON public.leads FOR UPDATE TO authenticated USING (public.can_edit(workspace_id, auth.uid()));
CREATE POLICY "leads delete" ON public.leads FOR DELETE TO authenticated USING (public.is_admin(workspace_id, auth.uid()));
CREATE TRIGGER leads_updated BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- LEAD SUBMISSIONS
CREATE TABLE public.lead_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  form_id UUID REFERENCES public.forms(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX lead_submissions_idem ON public.lead_submissions(form_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
GRANT SELECT ON public.lead_submissions TO authenticated;
GRANT ALL ON public.lead_submissions TO service_role;
ALTER TABLE public.lead_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "submissions read" ON public.lead_submissions FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));

-- ACTIVITIES
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  actor_id UUID,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX activities_lead_idx ON public.activities(lead_id, created_at DESC);
GRANT SELECT, INSERT ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activities read" ON public.activities FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "activities insert" ON public.activities FOR INSERT TO authenticated WITH CHECK (public.can_edit(workspace_id, auth.uid()) AND actor_id = auth.uid());

-- TASKS
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type public.task_type NOT NULL DEFAULT 'follow_up',
  status public.task_status NOT NULL DEFAULT 'open',
  priority public.task_priority NOT NULL DEFAULT 'normal',
  due_at TIMESTAMPTZ,
  assignee_id UUID,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX tasks_workspace_idx ON public.tasks(workspace_id, due_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks read" ON public.tasks FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "tasks insert" ON public.tasks FOR INSERT TO authenticated WITH CHECK (public.can_edit(workspace_id, auth.uid()));
CREATE POLICY "tasks update" ON public.tasks FOR UPDATE TO authenticated USING (public.can_edit(workspace_id, auth.uid()));
CREATE POLICY "tasks delete" ON public.tasks FOR DELETE TO authenticated USING (public.is_admin(workspace_id, auth.uid()));
CREATE TRIGGER tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SCORING RULES
CREATE TABLE public.scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  field TEXT NOT NULL,
  operator TEXT NOT NULL,
  value TEXT,
  points INT NOT NULL DEFAULT 0,
  priority INT NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scoring_rules TO authenticated;
GRANT ALL ON public.scoring_rules TO service_role;
ALTER TABLE public.scoring_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scoring read" ON public.scoring_rules FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "scoring insert" ON public.scoring_rules FOR INSERT TO authenticated WITH CHECK (public.is_admin(workspace_id, auth.uid()));
CREATE POLICY "scoring update" ON public.scoring_rules FOR UPDATE TO authenticated USING (public.is_admin(workspace_id, auth.uid()));
CREATE POLICY "scoring delete" ON public.scoring_rules FOR DELETE TO authenticated USING (public.is_admin(workspace_id, auth.uid()));
CREATE TRIGGER scoring_updated BEFORE UPDATE ON public.scoring_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ROUTING RULES
CREATE TABLE public.routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  field TEXT NOT NULL,
  operator TEXT NOT NULL,
  value TEXT,
  assign_to UUID,
  strategy TEXT NOT NULL DEFAULT 'user',
  priority INT NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routing_rules TO authenticated;
GRANT ALL ON public.routing_rules TO service_role;
ALTER TABLE public.routing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "routing read" ON public.routing_rules FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "routing insert" ON public.routing_rules FOR INSERT TO authenticated WITH CHECK (public.is_admin(workspace_id, auth.uid()));
CREATE POLICY "routing update" ON public.routing_rules FOR UPDATE TO authenticated USING (public.is_admin(workspace_id, auth.uid()));
CREATE POLICY "routing delete" ON public.routing_rules FOR DELETE TO authenticated USING (public.is_admin(workspace_id, auth.uid()));
CREATE TRIGGER routing_updated BEFORE UPDATE ON public.routing_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CONSENT RECORDS
CREATE TABLE public.consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT false,
  consent_text TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.consent_records TO authenticated;
GRANT ALL ON public.consent_records TO service_role;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consent read" ON public.consent_records FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications read own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications update own" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- NOTIFICATION PREFS
CREATE TABLE public.notification_prefs (
  user_id UUID PRIMARY KEY,
  email_assignment BOOLEAN NOT NULL DEFAULT true,
  email_overdue BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notification_prefs TO authenticated;
GRANT ALL ON public.notification_prefs TO service_role;
ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prefs own" ON public.notification_prefs FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- AUDIT LOG
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_id UUID,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id UUID,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit read" ON public.audit_log FOR SELECT TO authenticated USING (public.is_admin(workspace_id, auth.uid()));

-- DEFAULT RULES SEEDED ON WORKSPACE CREATION
CREATE OR REPLACE FUNCTION public.seed_workspace_defaults() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.scoring_rules (workspace_id, label, field, operator, value, points, priority) VALUES
    (NEW.id, 'Business email address', 'email', 'is_business_email', NULL, 10, 10),
    (NEW.id, 'Phone number provided', 'phone', 'is_present', NULL, 10, 20),
    (NEW.id, 'Company provided', 'company', 'is_present', NULL, 5, 30),
    (NEW.id, 'Budget above 5000', 'budget', 'greater_than', '5000', 20, 40),
    (NEW.id, 'Requested a demo', 'interest', 'contains', 'demo', 25, 50),
    (NEW.id, 'Detailed message', 'message', 'longer_than', '120', 10, 60),
    (NEW.id, 'Invalid email address', 'email', 'is_invalid_email', NULL, -30, 70),
    (NEW.id, 'Do not contact', 'do_not_contact', 'is_true', NULL, -100, 80);

  INSERT INTO public.routing_rules (workspace_id, label, field, operator, value, strategy, priority) VALUES
    (NEW.id, 'Round-robin fallback', 'any', 'always', NULL, 'round_robin', 900);
  RETURN NEW;
END; $$;
CREATE TRIGGER workspaces_seed AFTER INSERT ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION public.seed_workspace_defaults();
CREATE TRIGGER workspaces_updated BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
