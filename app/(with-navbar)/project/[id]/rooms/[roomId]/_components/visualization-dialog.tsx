import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface SuggestedProduct {
  name: string;
  price: string;
  imageUrl: string;
  storeName: string;
}

interface VisualizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photos: { storageId: Id<"_storage">; url: string }[];
  selectedPhotoStorageId: Id<"_storage"> | null;
  onSelectPhoto: (id: Id<"_storage">) => void;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onGenerate: (includeProduct: boolean) => void;
  defaultPrompt: string;
  suggestedProduct?: SuggestedProduct;
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
  suggestedProduct,
}: VisualizationDialogProps) {
  const [includeProduct, setIncludeProduct] = useState(true);

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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
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

          {suggestedProduct && (
            <div>
              <Label>Product reference</Label>
              <button
                type="button"
                onClick={() => setIncludeProduct((v) => !v)}
                className={`mt-2 w-full flex items-center gap-3 p-2 rounded-md border-2 transition-all text-left ${
                  includeProduct
                    ? "border-selection-border bg-selection-ring/10"
                    : "border-border opacity-50"
                }`}
              >
                <img
                  src={suggestedProduct.imageUrl}
                  alt={suggestedProduct.name}
                  className="w-14 h-14 object-contain rounded flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{suggestedProduct.name}</p>
                  <p className="text-xs text-muted-foreground">{suggestedProduct.price} · {suggestedProduct.storeName}</p>
                </div>
                <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                  includeProduct ? "bg-primary border-primary" : "border-muted-foreground"
                }`}>
                  {includeProduct && (
                    <svg className="w-3 h-3 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
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
          <Button
            onClick={() => onGenerate(includeProduct)}
            className="w-full"
            disabled={!prompt || !selectedPhotoStorageId}
          >
            Generate Visualization
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
