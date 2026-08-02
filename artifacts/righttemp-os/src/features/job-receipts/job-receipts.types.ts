export interface JobReceipt {
  id: string;
  jobId: string;
  customerId: string;
  fileName: string;
  storagePath: string;
  amount: number | null;
  vendor: string | null;
  documentDate: string | null;
  notes: string | null;
  createdAt: string;
}

export interface JobReceiptRow {
  id: string;
  job_id: string;
  customer_id: string;
  file_name: string;
  storage_path: string;
  amount: number | null;
  vendor: string | null;
  document_date: string | null;
  notes: string | null;
  created_at: string;
}
