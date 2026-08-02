import { getCurrentOrganizationId } from "@/lib/get-current-organization-id";
import { supabase } from "@/lib/supabase";
import type { JobWalkthrough, WalkthroughPhoto, WalkthroughPhotoRow } from "./estimate-walkthrough.types";

const bucket = "estimate-walkthroughs";

function mapPhoto(row: WalkthroughPhotoRow): WalkthroughPhoto {
  return {
    id: row.id,
    estimateId: row.estimate_id,
    fileName: row.file_name,
    storagePath: row.storage_path,
    caption: row.caption,
    createdAt: row.created_at,
  };
}

export async function getWalkthroughPhotos(estimateId: string): Promise<WalkthroughPhoto[]> {
  const organizationId = await getCurrentOrganizationId();
  const { data, error } = await supabase
    .from("estimate_walkthrough_photos")
    .select("id, estimate_id, file_name, storage_path, caption, created_at")
    .eq("organization_id", organizationId)
    .eq("estimate_id", estimateId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Unable to load walkthrough photos: ${error.message}`);
  return ((data ?? []) as WalkthroughPhotoRow[]).map(mapPhoto);
}

export async function uploadWalkthroughPhoto(estimateId: string, file: File): Promise<void> {
  const organizationId = await getCurrentOrganizationId();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error("You must be signed in to upload walkthrough photos.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `${organizationId}/${estimateId}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, file, { contentType: file.type || "image/jpeg", upsert: false });
  if (uploadError) throw new Error(`Unable to upload walkthrough photo: ${uploadError.message}`);

  const { error: metadataError } = await supabase.from("estimate_walkthrough_photos").insert({
    organization_id: organizationId,
    estimate_id: estimateId,
    file_name: file.name,
    storage_path: storagePath,
    mime_type: file.type || null,
    file_size: file.size,
    uploaded_by: authData.user.id,
  });
  if (metadataError) {
    await supabase.storage.from(bucket).remove([storagePath]);
    throw new Error(`Unable to save walkthrough photo: ${metadataError.message}`);
  }
}

export async function openWalkthroughPhoto(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 60);
  if (error) throw new Error(`Unable to open walkthrough photo: ${error.message}`);
  return data.signedUrl;
}

export async function deleteWalkthroughPhoto(photo: WalkthroughPhoto): Promise<void> {
  const organizationId = await getCurrentOrganizationId();
  const { error: metadataError } = await supabase
    .from("estimate_walkthrough_photos")
    .delete()
    .eq("id", photo.id)
    .eq("organization_id", organizationId);
  if (metadataError) throw new Error(`Unable to delete walkthrough photo: ${metadataError.message}`);
  const { error: storageError } = await supabase.storage.from(bucket).remove([photo.storagePath]);
  if (storageError) throw new Error(`Photo record was deleted, but its file could not be removed: ${storageError.message}`);
}

export async function getJobWalkthrough(jobId: string): Promise<JobWalkthrough | null> {
  const organizationId = await getCurrentOrganizationId();
  const { data: estimate, error } = await supabase
    .from("estimates")
    .select("id, title, notes")
    .eq("organization_id", organizationId)
    .eq("job_id", jobId)
    .maybeSingle();
  if (error) throw new Error(`Unable to load job walkthrough: ${error.message}`);
  if (!estimate) return null;
  return {
    estimateId: estimate.id,
    title: estimate.title,
    notes: estimate.notes,
    photos: await getWalkthroughPhotos(estimate.id),
  };
}
