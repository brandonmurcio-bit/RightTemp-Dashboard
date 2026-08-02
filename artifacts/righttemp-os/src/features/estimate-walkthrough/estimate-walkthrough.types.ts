export interface WalkthroughPhoto {
  id: string;
  estimateId: string;
  fileName: string;
  storagePath: string;
  caption: string | null;
  createdAt: string;
}

export interface WalkthroughPhotoRow {
  id: string;
  estimate_id: string;
  file_name: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
}

export interface JobWalkthrough {
  estimateId: string;
  title: string;
  notes: string | null;
  photos: WalkthroughPhoto[];
}
