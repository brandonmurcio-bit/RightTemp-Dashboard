ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS follow_up_time TIME;

UPDATE public.leads
SET follow_up_time = TIME '09:00'
WHERE follow_up_date IS NOT NULL
  AND follow_up_time IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_follow_up_due
  ON public.leads (organization_id, follow_up_date, follow_up_time)
  WHERE follow_up_date IS NOT NULL;
