import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Maximize2, Trash2 } from "lucide-react";

interface VisualizationData {
  _id: Id<"visualizations">;
  status: "queued" | "processing" | "completed" | "failed";
  output?: { url: string };
  error?: string;
  input: { prompt: string };
}

interface VisualizationsTabProps {
  visualizations: VisualizationData[] | undefined;
  completedVisualizations: VisualizationData[];
  roomHasPhotos: boolean;
  onOpenLightbox: (index: number) => void;
  onDelete: (id: Id<"visualizations">) => void;
  onNewVisualization: () => void;
}

export function VisualizationsTab({
  visualizations,
  completedVisualizations,
  roomHasPhotos,
  onOpenLightbox,
  onDelete,
  onNewVisualization,
}: VisualizationsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Generated Visualizations</span>
          <Button size="sm" onClick={onNewVisualization} disabled={!roomHasPhotos}>
            New Visualization
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {visualizations && visualizations.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {visualizations.map((vis) => (
              <div key={vis._id} className="border rounded-lg overflow-hidden">
                <VisualizationPreview
                  vis={vis}
                  onOpenLightbox={() =>
                    onOpenLightbox(completedVisualizations.findIndex((item) => item._id === vis._id))
                  }
                />
                <div className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-text-secondary whitespace-pre-wrap break-words">
                      {vis.input.prompt}
                    </p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="destructive" className="h-7 w-7" aria-label="Delete visualization">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete visualization?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this generated visualization. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(vis._id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-text-tertiary text-center py-8">
            No visualizations yet. Generate one from recommendations or create a custom one.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function VisualizationPreview({
  vis,
  onOpenLightbox,
}: {
  vis: VisualizationData;
  onOpenLightbox: () => void;
}) {
  if (vis.status === "completed" && vis.output) {
    return (
      <div className="relative group">
        <img src={vis.output.url} alt="Visualization" className="w-full aspect-video object-cover" />
        <button
          type="button"
          className="absolute top-2 right-2 rounded-full bg-black/60 text-white p-1.5 opacity-0 group-hover:opacity-100 transition"
          onClick={onOpenLightbox}
          aria-label="Open full screen"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (vis.status === "processing") {
    return (
      <div className="aspect-video bg-surface-inset flex items-center justify-center">
        <div className="text-center">
          <Progress value={50} className="w-32 mb-2" />
          <p className="text-sm text-text-tertiary">Generating...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="aspect-video bg-red-50 dark:bg-red-950/30 flex flex-col items-center justify-center px-4 text-center gap-2">
      <div>
        <p className="text-sm text-destructive font-medium">Failed</p>
        {vis.error && <p className="text-xs text-destructive mt-1 line-clamp-2">{vis.error}</p>}
      </div>
    </div>
  );
}
