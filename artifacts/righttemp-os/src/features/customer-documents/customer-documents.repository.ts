import { getCurrentOrganizationId } from "@/lib/get-current-organization-id";
import { supabase } from "@/lib/supabase";
import type { CustomerDocument, CustomerDocumentRow } from "./customer-documents.types";

const bucket = "customer-documents";

function mapDocument(row: CustomerDocumentRow): CustomerDocument {
  return {
    id: row.id,
    customerId: row.customer_id,
    documentType: row.document_type,
    fileName: row.file_name,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    createdAt: row.created_at,
  };
}

export async function getCustomerDocuments(customerId: string): Promise<CustomerDocument[]> {
  const organizationId = await getCurrentOrganizationId();
  const { data, error } = await supabase
    .from("customer_documents")
    .select("id, customer_id, document_type, file_name, storage_path, mime_type, file_size, created_at")
    .eq("organization_id", organizationId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Unable to load contracts: ${error.message}`);
  return ((data ?? []) as CustomerDocumentRow[]).map(mapDocument);
}

export async function uploadCustomerDocument(customerId: string, file: File): Promise<void> {
  const organizationId = await getCurrentOrganizationId();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error("You must be signed in to upload contracts.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `${organizationId}/${customerId}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error(`Unable to upload contract: ${uploadError.message}`);

  const { error: metadataError } = await supabase.from("customer_documents").insert({
    organization_id: organizationId,
    customer_id: customerId,
    document_type: "contract",
    file_name: file.name,
    storage_path: storagePath,
    mime_type: file.type || null,
    file_size: file.size,
    uploaded_by: authData.user.id,
  });
  if (metadataError) {
    await supabase.storage.from(bucket).remove([storagePath]);
    throw new Error(`Unable to save contract record: ${metadataError.message}`);
  }
}

export async function openCustomerDocument(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 60);
  if (error) throw new Error(`Unable to open contract: ${error.message}`);
  return data.signedUrl;
}

export async function deleteCustomerDocument(document: CustomerDocument): Promise<void> {
  const organizationId = await getCurrentOrganizationId();
  const { error: storageError } = await supabase.storage.from(bucket).remove([document.storagePath]);
  if (storageError) throw new Error(`Unable to delete contract file: ${storageError.message}`);
  const { error } = await supabase
    .from("customer_documents")
    .delete()
    .eq("id", document.id)
    .eq("organization_id", organizationId);
  if (error) throw new Error(`Unable to delete contract record: ${error.message}`);
}
