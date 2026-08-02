import { useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, ExternalLink, Images, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useDeleteWalkthroughPhoto,
  useUploadWalkthroughPhoto,
  useWalkthroughPhotos,
  walkthroughQueryKeys,
} from "@/features/estimate-walkthrough/estimate-walkthrough.hooks";
import { openWalkthroughPhoto } from "@/features/estimate-walkthrough/estimate-walkthrough.repository";
import { useToast } from "@/hooks/use-toast";

export function EstimateWalkthroughPhotos({ estimateId }: { estimateId: string }) {
  const uploadInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: photos, isLoading } = useWalkthroughPhotos(estimateId);
  const uploadPhoto = useUploadWalkthroughPhoto();
  const deletePhoto = useDeleteWalkthroughPhoto();

  const upload = (file?: File) => {
    if (!file) return;
    uploadPhoto.mutate(
      { estimateId, file },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: walkthroughQueryKeys.photos(estimateId) });
          toast({ title: "Walkthrough photo saved", description: "It will follow this estimate into the job." });
        },
        onError: (error) =>
          toast({ title: "Photo upload failed", description: error.message, variant: "destructive" }),
      },
    );
  };

  const open = async (storagePath: string) => {
    try {
      window.open(await openWalkthroughPhoto(storagePath), "_blank", "noopener,noreferrer");
    } catch (error) {
      toast({
        title: "Unable to open photo",
        description: error instanceof Error ? error.message : "Photo could not be opened.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Images className="h-4 w-4 text-primary" /> Walkthrough Photos
          {!isLoading && <span className="text-xs font-normal text-muted-foreground">({photos?.length ?? 0})</span>}
        </p>
        <div className="flex gap-2">
          <input ref={uploadInput} type="file" className="hidden" accept="image/*,application/pdf" onChange={(event) => upload(event.target.files?.[0])} />
          <input ref={cameraInput} type="file" className="hidden" accept="image/*" capture="environment" onChange={(event) => upload(event.target.files?.[0])} />
          <Button type="button" size="sm" variant="outline" disabled={uploadPhoto.isPending} onClick={() => uploadInput.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Upload
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={uploadPhoto.isPending} onClick={() => cameraInput.current?.click()}>
            <Camera className="mr-2 h-4 w-4" /> Camera
          </Button>
        </div>
      </div>
      {uploadPhoto.isPending && <p className="text-xs text-muted-foreground">Uploading photo...</p>}
      <div className="space-y-2">
        {(photos ?? []).map((photo) => (
          <div key={photo.id} className="flex items-center justify-between gap-3 rounded-md border p-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{photo.fileName}</p>
              <p className="text-[11px] text-muted-foreground">{new Date(photo.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="flex">
              <Button type="button" size="icon" variant="ghost" onClick={() => open(photo.storagePath)}><ExternalLink className="h-4 w-4" /></Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="text-destructive"
                disabled={deletePhoto.isPending}
                onClick={() => {
                  if (!window.confirm(`Delete ${photo.fileName}?`)) return;
                  deletePhoto.mutate(photo, {
                    onSuccess: () => queryClient.invalidateQueries({ queryKey: walkthroughQueryKeys.photos(estimateId) }),
                    onError: (error) => toast({ title: "Delete failed", description: error.message, variant: "destructive" }),
                  });
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
