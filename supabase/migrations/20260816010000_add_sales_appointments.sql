CREATE TABLE IF NOT EXISTS public.sales_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  appointment_type TEXT NOT NULL CHECK (appointment_type IN ('phone_call', 'in_home_estimate')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'rescheduled', 'cancelled', 'no_show')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

ALTER TABLE public.sales_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can select sales appointments" ON public.sales_appointments FOR SELECT TO authenticated USING (private.is_org_member(organization_id));
CREATE POLICY "Org members can insert sales appointments" ON public.sales_appointments FOR INSERT TO authenticated WITH CHECK (private.is_org_member(organization_id));
CREATE POLICY "Org members can update sales appointments" ON public.sales_appointments FOR UPDATE TO authenticated USING (private.is_org_member(organization_id)) WITH CHECK (private.is_org_member(organization_id));
CREATE POLICY "Org admins can delete sales appointments" ON public.sales_appointments FOR DELETE TO authenticated USING (private.is_org_role(organization_id, 'admin'));
CREATE INDEX IF NOT EXISTS idx_sales_appointments_org_start ON public.sales_appointments(organization_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_sales_appointments_lead ON public.sales_appointments(lead_id);
DROP TRIGGER IF EXISTS trg_sales_appointments_updated_at ON public.sales_appointments;
CREATE TRIGGER trg_sales_appointments_updated_at BEFORE UPDATE ON public.sales_appointments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
