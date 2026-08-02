import { getCurrentOrganizationId } from "@/lib/get-current-organization-id";
import { supabase } from "@/lib/supabase";
import type { JobReceipt, JobReceiptRow } from "./job-receipts.types";

const bucket = "job-documents";

function mapReceipt(row: JobReceiptRow): JobReceipt {
  return {
    id: row.id,
    jobId: row.job_id,
    customerId: row.customer_id,
    fileName: row.file_name,
    storagePath: row.storage_path,
    amount: row.amount === null ? null : Number(row.amount),
    vendor: row.vendor,
    documentDate: row.document_date,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export async function getJobReceipts(jobId: string): Promise<JobReceipt[]> {
  const organizationId = await getCurrentOrganizationId();
  const { data, error } = await supabase
    .from("job_documents")
    .select("id, job_id, customer_id, file_name, storage_path, amount, vendor, document_date, notes, created_at")
    .eq("organization_id", organizationId)
    .eq("job_id", jobId)
    .eq("document_type", "vendor_receipt")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Unable to load receipts: ${error.message}`);
  return ((data ?? []) as JobReceiptRow[]).map(mapReceipt);
}

export async function uploadJobReceipt({
  jobId,
  customerId,
  file,
  vendor,
  amount,
}: {
  jobId: string;
  customerId: string;
  file: File;
  vendor?: string;
  amount?: number;
}): Promise<void> {
  const organizationId = await getCurrentOrganizationId();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error("You must be signed in to upload receipts.");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `${organizationId}/${jobId}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (uploadError) throw new Error(`Unable to upload receipt: ${uploadError.message}`);

  const { error: metadataError } = await supabase.from("job_documents").insert({
    organization_id: organizationId,
    job_id: jobId,
    customer_id: customerId,
    document_type: "vendor_receipt",
    file_name: file.name,
    storage_path: storagePath,
    vendor: vendor || null,
    amount: amount ?? null,
    document_date: new Date().toISOString().slice(0, 10),
    uploaded_by: authData.user.id,
  });
  if (metadataError) {
    await supabase.storage.from(bucket).remove([storagePath]);
    throw new Error(`Unable to save receipt record: ${metadataError.message}`);
  }
}

export async function openJobReceipt(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 60);
  if (error) throw new Error(`Unable to open receipt: ${error.message}`);
  return data.signedUrl;
}

export async function deleteJobReceipt(receipt: JobReceipt): Promise<void> {
  const organizationId = await getCurrentOrganizationId();
  const { error: metadataError } = await supabase
    .from("job_documents")
    .delete()
    .eq("id", receipt.id)
    .eq("organization_id", organizationId);
  if (metadataError) throw new Error(`Unable to delete receipt record: ${metadataError.message}`);

  const { error: storageError } = await supabase.storage.from(bucket).remove([receipt.storagePath]);
  if (storageError) throw new Error(`Receipt record was deleted, but its file could not be removed: ${storageError.message}`);
}
