export type ContractStatus = "draft" | "presented" | "signed";
export interface ContractDocument {
  id: string; estimateId: string; customerId: string | null; jobId: string | null;
  fileName: string; storagePath: string; mimeType: string | null; status: ContractStatus;
  signedBy: string | null; signatureDataUrl: string | null; signedAt: string | null; createdAt: string;
}
