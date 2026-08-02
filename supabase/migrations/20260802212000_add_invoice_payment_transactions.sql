-- Invoice numbering and auditable payment history.

CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1;

CREATE OR REPLACE FUNCTION public.assign_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.receipt_number IS NULL OR btrim(NEW.receipt_number) = '' THEN
    NEW.receipt_number := 'INV-' || lpad(nextval('public.invoice_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payments_assign_invoice_number ON public.payments;
CREATE TRIGGER trg_payments_assign_invoice_number
  BEFORE INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.assign_invoice_number();

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id       uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  job_id           uuid NOT NULL REFERENCES public.jobs(id) ON DELETE RESTRICT,
  amount           numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_method   text NOT NULL CHECK (payment_method IN ('cash', 'check', 'card', 'ach', 'financing', 'other')),
  payment_date     date NOT NULL DEFAULT current_date,
  reference        text,
  notes            text,
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_org_id
  ON public.payment_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_invoice_id
  ON public.payment_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_job_id
  ON public.payment_transactions(job_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_date
  ON public.payment_transactions(payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_by
  ON public.payment_transactions(created_by);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can select payment transactions"
  ON public.payment_transactions FOR SELECT TO authenticated
  USING (private.is_org_member(organization_id));

CREATE POLICY "Org members can insert payment transactions"
  ON public.payment_transactions FOR INSERT TO authenticated
  WITH CHECK (private.is_org_member(organization_id));

CREATE POLICY "Org admins can delete payment transactions"
  ON public.payment_transactions FOR DELETE TO authenticated
  USING (private.is_org_role(organization_id, 'admin'));

GRANT SELECT, INSERT, DELETE ON public.payment_transactions TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_payment_transaction()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  invoice_total numeric(12,2);
  paid_total numeric(12,2);
  invoice_status text;
  invoice_org uuid;
  invoice_job uuid;
BEGIN
  SELECT total, status, organization_id, job_id
    INTO invoice_total, invoice_status, invoice_org, invoice_job
    FROM public.payments
   WHERE id = NEW.invoice_id;

  IF invoice_total IS NULL THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;
  IF invoice_status = 'void' THEN
    RAISE EXCEPTION 'Cannot record payment on a void invoice';
  END IF;
  IF invoice_org <> NEW.organization_id OR invoice_job <> NEW.job_id THEN
    RAISE EXCEPTION 'Payment does not match invoice organization and job';
  END IF;

  SELECT COALESCE(sum(amount), 0)
    INTO paid_total
    FROM public.payment_transactions
   WHERE invoice_id = NEW.invoice_id;

  IF paid_total + NEW.amount > invoice_total THEN
    RAISE EXCEPTION 'Payment exceeds remaining invoice balance';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_transactions_validate ON public.payment_transactions;
CREATE TRIGGER trg_payment_transactions_validate
  BEFORE INSERT ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.validate_payment_transaction();

CREATE OR REPLACE FUNCTION public.sync_invoice_payment_totals()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  target_invoice_id uuid := COALESCE(NEW.invoice_id, OLD.invoice_id);
  paid_total numeric(12,2);
  invoice_total numeric(12,2);
  invoice_sent_at timestamptz;
  latest_method text;
  latest_date date;
BEGIN
  SELECT COALESCE(sum(amount), 0)
    INTO paid_total
    FROM public.payment_transactions
   WHERE invoice_id = target_invoice_id;

  SELECT total, sent_at
    INTO invoice_total, invoice_sent_at
    FROM public.payments
   WHERE id = target_invoice_id;

  SELECT payment_method, payment_date
    INTO latest_method, latest_date
    FROM public.payment_transactions
   WHERE invoice_id = target_invoice_id
   ORDER BY payment_date DESC, created_at DESC
   LIMIT 1;

  UPDATE public.payments
     SET amount_paid = paid_total,
         payment_method = latest_method,
         payment_date = latest_date,
         status = CASE
           WHEN status = 'void' THEN 'void'
           WHEN invoice_total > 0 AND paid_total >= invoice_total THEN 'paid'
           WHEN paid_total > 0 THEN 'partial'
           WHEN invoice_sent_at IS NOT NULL THEN 'sent'
           ELSE 'draft'
         END,
         paid_at = CASE
           WHEN invoice_total > 0 AND paid_total >= invoice_total THEN now()
           ELSE NULL
         END
   WHERE id = target_invoice_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_transactions_sync_invoice ON public.payment_transactions;
CREATE TRIGGER trg_payment_transactions_sync_invoice
  AFTER INSERT OR DELETE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_payment_totals();
