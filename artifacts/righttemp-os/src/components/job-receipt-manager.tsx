import { useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, ExternalLink, ReceiptText, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  jobReceiptQueryKeys,
  useDeleteJobReceipt,
  useJobReceipts,
  useUploadJobReceipt,
} from "@/features/job-receipts/job-receipts.hooks";
import { openJobReceipt } from "@/features/job-receipts/job-receipts.repository";
import { useToast } from "@/hooks/use-toast";

export function JobReceiptManager({
  jobId,
  customerId,
  vendor,
  amount,
}: {
  jobId: string;
  customerId: string;
  vendor?: string;
  amount?: number;
}) {
  const uploadInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: receipts, isLoading } = useJobReceipts(jobId);
  const uploadReceipt = useUploadJobReceipt();
  const deleteReceipt = useDeleteJobReceipt();

  const upload = (file?: File) => {
    if (!file) return;
    uploadReceipt.mutate(
      { jobId, customerId, file, vendor, amount },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: jobReceiptQueryKeys.list(jobId) });
          if (uploadInput.current) uploadInput.current.value = "";
          if (cameraInput.current) cameraInput.current.value = "";
          toast({ title: "Receipt saved", description: "The receipt is attached to this job PO." });
        },
        onError: (error) =>
          toast({ title: "Receipt upload failed", description: error.message, variant: "destructive" }),
      },
    );
  };

  const open = async (storagePath: string) => {
    try {
      const url = await openJobReceipt(storagePath);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast({
        title: "Unable to open receipt",
        description: error instanceof Error ? error.message : "The receipt could not be opened.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <ReceiptText className="h-4 w-4 text-primary" /> Receipts
          </p>
          <p className="text-xs text-muted-foreground">Upload a file or photograph the receipt.</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={uploadInput}
            type="file"
            className="hidden"
            accept="image/*,application/pdf"
            onChange={(event) => upload(event.target.files?.[0])}
          />
          <input
            ref={cameraInput}
            type="file"
            className="hidden"
            accept="image/*"
            capture="environment"
            onChange={(event) => upload(event.target.files?.[0])}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={uploadReceipt.isPending}
            onClick={() => uploadInput.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" /> Upload
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={uploadReceipt.isPending}
            onClick={() => cameraInput.current?.click()}
          >
            <Camera className="mr-2 h-4 w-4" /> Camera
          </Button>
        </div>
      </div>

      {uploadReceipt.isPending && (
        <p className="text-xs text-muted-foreground">Uploading receipt...</p>
      )}
      {isLoading && <p className="text-xs text-muted-foreground">Loading receipts...</p>}
      {!isLoading && (receipts ?? []).length === 0 && (
        <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
          No receipts attached.
        </p>
      )}
      <div className="space-y-2">
        {(receipts ?? []).map((receipt) => (
          <div key={receipt.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{receipt.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(receipt.createdAt).toLocaleDateString()}
                {receipt.amount !== null ? ` · $${receipt.amount.toFixed(2)}` : ""}
              </p>
            </div>
            <div className="flex gap-1">
              <Button type="button" size="icon" variant="ghost" onClick={() => open(receipt.storagePath)}>
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="text-destructive"
                disabled={deleteReceipt.isPending}
                onClick={() => {
                  if (!window.confirm(`Delete ${receipt.fileName}?`)) return;
                  deleteReceipt.mutate(receipt, {
                    onSuccess: () =>
                      queryClient.invalidateQueries({ queryKey: jobReceiptQueryKeys.list(jobId) }),
                    onError: (error) =>
                      toast({ title: "Delete failed", description: error.message, variant: "destructive" }),
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
