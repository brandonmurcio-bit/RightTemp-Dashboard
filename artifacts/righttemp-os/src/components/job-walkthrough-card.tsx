import { ExternalLink, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useJobWalkthrough } from "@/features/estimate-walkthrough/estimate-walkthrough.hooks";
import { openWalkthroughPhoto } from "@/features/estimate-walkthrough/estimate-walkthrough.repository";
import { useToast } from "@/hooks/use-toast";

export function JobWalkthroughCard({ jobId }: { jobId: string }) {
  const { data: walkthrough, isLoading } = useJobWalkthrough(jobId);
  const { toast } = useToast();

  if (isLoading) {
    return <Card><CardContent className="py-8 text-sm text-muted-foreground">Loading estimate walkthrough...</CardContent></Card>;
  }
  if (!walkthrough) return null;

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Images className="h-5 w-5 text-primary" /> Estimate Walkthrough
        </CardTitle>
        <p className="text-sm text-muted-foreground">{walkthrough.title}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {walkthrough.notes && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Walkthrough Notes</p>
            <p className="whitespace-pre-wrap text-sm">{walkthrough.notes}</p>
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {walkthrough.photos.map((photo) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => open(photo.storagePath)}
              className="flex items-center justify-between gap-3 rounded-lg border p-3 text-left hover:bg-muted/50"
            >
              <span className="min-w-0 truncate text-sm">{photo.fileName}</span>
              <ExternalLink className="h-4 w-4 shrink-0 text-primary" />
            </button>
          ))}
        </div>
        {!walkthrough.notes && walkthrough.photos.length === 0 && (
          <p className="text-sm text-muted-foreground">No walkthrough notes or photos were added.</p>
        )}
      </CardContent>
    </Card>
  );
}
