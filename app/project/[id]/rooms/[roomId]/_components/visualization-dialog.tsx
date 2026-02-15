import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface VisualizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photos: { storageId: Id<"_storage">; url: string }[];
  selectedPhotoStorageId: Id<"_storage"> | null;
  onSelectPhoto: (id: Id<"_storage">) => void;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onGenerate: () => void;
  defaultPrompt: string;
}

export function VisualizationDialog({
  open,
  onOpenChange,
  photos,
  selectedPhotoStorageId,
  onSelectPhoto,
  prompt,
  onPromptChange,
  onGenerate,
  defaultPrompt,
}: VisualizationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Visualization</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {photos.length > 0 && (
            <div>
              <Label>Select base photo</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {photos.map((photo) => (
                  <button
                    key={photo.storageId}
                    type="button"
                    className={`aspect-video rounded overflow-hidden border-2 transition-all ${
                      selectedPhotoStorageId === photo.storageId
                        ? "border-selection-border ring-2 ring-selection-ring"
                        : "border-transparent hover:border-border"
                    }`}
                    onClick={() => onSelectPhoto(photo.storageId)}
                  >
                    <img src={photo.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <Label htmlFor="prompt">Describe only the changes (keep everything else the same)</Label>
            <Input
              id="prompt"
              placeholder={defaultPrompt}
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
            />
          </div>
          <Button onClick={onGenerate} className="w-full" disabled={!prompt || !selectedPhotoStorageId}>
            Generate Visualization
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
