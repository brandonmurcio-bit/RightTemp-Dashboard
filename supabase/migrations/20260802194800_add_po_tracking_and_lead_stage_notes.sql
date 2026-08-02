CREATE SEQUENCE IF NOT EXISTS public.customer_po_number_seq;
CREATE SEQUENCE IF NOT EXISTS public.job_po_number_seq;

ALTER TABLE public.customers
  ADD COLUMN po_number TEXT,
  ADD COLUMN po_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (po_status IN ('pending', 'ordered', 'received', 'closed', 'cancelled')),
  ADD COLUMN po_vendor TEXT,
  ADD COLUMN po_amount NUMERIC(12,2),
  ADD COLUMN po_notes TEXT;

ALTER TABLE public.jobs
  ADD COLUMN po_number TEXT,
  ADD COLUMN po_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (po_status IN ('pending', 'ordered', 'received', 'closed', 'cancelled')),
  ADD COLUMN po_vendor TEXT,
  ADD COLUMN po_amount NUMERIC(12,2),
  ADD COLUMN po_notes TEXT;

CREATE OR REPLACE FUNCTION private.assign_customer_po_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.po_number IS NULL THEN
    NEW.po_number := 'PO-C-' || lpad(nextval('public.customer_po_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.assign_job_po_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.po_number IS NULL THEN
    NEW.po_number := 'PO-J-' || lpad(nextval('public.job_po_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_customers_assign_po_number
  BEFORE INSERT ON public.customers
  FOR EACH ROW EXECUTE FUNCTION private.assign_customer_po_number();

CREATE TRIGGER trg_jobs_assign_po_number
  BEFORE INSERT ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION private.assign_job_po_number();

UPDATE public.customers
SET po_number = 'PO-C-' || lpad(nextval('public.customer_po_number_seq')::text, 6, '0')
WHERE po_number IS NULL;

UPDATE public.jobs
SET po_number = 'PO-J-' || lpad(nextval('public.job_po_number_seq')::text, 6, '0')
WHERE po_number IS NULL;

ALTER TABLE public.customers ALTER COLUMN po_number SET NOT NULL;
ALTER TABLE public.jobs ALTER COLUMN po_number SET NOT NULL;
CREATE UNIQUE INDEX idx_customers_po_number ON public.customers(po_number);
CREATE UNIQUE INDEX idx_jobs_po_number ON public.jobs(po_number);
CREATE INDEX idx_customers_po_status ON public.customers(po_status);
CREATE INDEX idx_jobs_po_status ON public.jobs(po_status);

ALTER TABLE public.leads
  ADD COLUMN contacted_notes TEXT,
  ADD COLUMN qualified_notes TEXT;
