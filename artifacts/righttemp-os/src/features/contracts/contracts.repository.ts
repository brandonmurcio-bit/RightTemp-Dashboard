import { getCurrentOrganizationId } from "@/lib/get-current-organization-id";
import { supabase } from "@/lib/supabase";
import type { ContractDocument, ContractStatus } from "./contracts.types";

const bucket = "customer-documents";
const select = "id, estimate_id, customer_id, job_id, file_name, storage_path, mime_type, status, signed_by, signature_data_url, signed_at, created_at";
const map = (row: any): ContractDocument => ({ id: row.id, estimateId: row.estimate_id, customerId: row.customer_id, jobId: row.job_id, fileName: row.file_name, storagePath: row.storage_path, mimeType: row.mime_type, status: row.status, signedBy: row.signed_by, signatureDataUrl: row.signature_data_url, signedAt: row.signed_at, createdAt: row.created_at });

export async function getContracts(filters: { estimateId?: string; customerId?: string; jobId?: string }) {
  const organizationId = await getCurrentOrganizationId();
  let query = supabase.from("contract_documents").select(select).eq("organization_id", organizationId);
  if (filters.estimateId) query = query.eq("estimate_id", filters.estimateId);
  if (filters.customerId) query = query.eq("customer_id", filters.customerId);
  if (filters.jobId) query = query.eq("job_id", filters.jobId);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw new Error(`Unable to load contracts: ${error.message}`);
  return (data ?? []).map(map);
}

export async function uploadContract(estimateId: string, file: File) {
  const organizationId = await getCurrentOrganizationId();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("You must be signed in.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `${organizationId}/contracts/${estimateId}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, file, { contentType: file.type || "application/octet-stream" });
  if (uploadError) throw new Error(`Unable to upload contract: ${uploadError.message}`);
  const { error } = await supabase.from("contract_documents").insert({ organization_id: organizationId, estimate_id: estimateId, file_name: file.name, storage_path: storagePath, mime_type: file.type || null, file_size: file.size, uploaded_by: auth.user.id });
  if (error) { await supabase.storage.from(bucket).remove([storagePath]); throw new Error(`Unable to save contract: ${error.message}`); }
}

export async function updateContractStatus(id: string, status: ContractStatus) {
  const organizationId = await getCurrentOrganizationId();
  const { error } = await supabase.from("contract_documents").update({ status }).eq("id", id).eq("organization_id", organizationId);
  if (error) throw new Error(`Unable to update contract: ${error.message}`);
}
export async function signContract(id: string, signedBy: string, signatureDataUrl: string) {
  const organizationId = await getCurrentOrganizationId();
  const { error } = await supabase.from("contract_documents").update({ status: "signed", signed_by: signedBy, signature_data_url: signatureDataUrl, signed_at: new Date().toISOString() }).eq("id", id).eq("organization_id", organizationId);
  if (error) throw new Error(`Unable to sign contract: ${error.message}`);
}
export async function openContract(path: string) { const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60); if (error) throw new Error(error.message); return data.signedUrl; }
