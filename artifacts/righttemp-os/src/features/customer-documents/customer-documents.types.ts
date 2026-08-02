export interface CustomerDocument {
  id: string;
  customerId: string;
  documentType: "contract" | "proposal" | "warranty" | "permit" | "other";
  fileName: string;
  storagePath: string;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string;
}

export interface CustomerDocumentRow {
  id: string;
  customer_id: string;
  document_type: CustomerDocument["documentType"];
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
}
