
ALTER TYPE public.score_band ADD VALUE IF NOT EXISTS 'qualified' AFTER 'warm';

CREATE OR REPLACE FUNCTION private.seed_workspace_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.scoring_rules (workspace_id, label, field, operator, value, points, priority) VALUES
    (NEW.id, 'Business email detected', 'email', 'is_business_email', NULL, 30, 10),
    (NEW.id, 'Budget provided', 'budget', 'is_present', NULL, 20, 20),
    (NEW.id, 'Healthy budget (5k+)', 'budget', 'greater_than', '5000', 10, 30),
    (NEW.id, 'Project starts within 30 days', 'interest', 'contains', 'asap', 10, 40),
    (NEW.id, 'Clear service request', 'message', 'longer_than', '120', 15, 50),
    (NEW.id, 'Phone number provided', 'phone', 'is_present', NULL, 10, 60),
    (NEW.id, 'Company provided', 'company', 'is_present', NULL, 5, 70),
    (NEW.id, 'Invalid email address', 'email', 'is_invalid_email', NULL, -30, 80),
    (NEW.id, 'Do not contact', 'do_not_contact', 'is_true', NULL, -100, 90);

  INSERT INTO public.routing_rules (workspace_id, label, field, operator, value, strategy, priority) VALUES
    (NEW.id, 'Hot leads to the workspace owner', 'score', 'greater_than', '79', 'owner', 100),
    (NEW.id, 'Round-robin fallback', 'any', 'always', NULL, 'round_robin', 900);
  RETURN NEW;
END;
$$;
