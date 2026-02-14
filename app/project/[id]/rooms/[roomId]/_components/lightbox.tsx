import { useEffect } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface LightboxVisualization {
  originalPhotoId: Id<"_storage">;
  output?: { url: string };
  input: { prompt: string };
}

interface LightboxProps {
  visualizations: LightboxVisualization[];
  index: number | null;
  photos: { storageId: Id<"_storage">; url: string }[];
  onIndexChange: (index: number | null) => void;
}

export function Lightbox({ visualizations, index, photos, onIndexChange }: LightboxProps) {
  const count = visualizations.length;

  useEffect(() => {
    if (index === null || count === 0) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onIndexChange(null);
      else if (event.key === "ArrowRight") onIndexChange((index + 1) % count);
      else if (event.key === "ArrowLeft") onIndexChange((index - 1 + count) % count);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [index, count, onIndexChange]);

  const currentVis = index !== null ? visualizations[index] : null;
  const originalPhoto = currentVis
    ? photos.find((p) => p.storageId === currentVis.originalPhotoId)
    : null;

  return (
    <Dialog open={index !== null} onOpenChange={(open) => !open && onIndexChange(null)}>
      <DialogContent className="!max-w-[98vw] w-[98vw] h-[95vh] p-0" showCloseButton={false}>
        <div className="relative h-full w-full bg-black">
          <button
            type="button"
            onClick={() => onIndexChange(null)}
            className="absolute top-3 right-3 z-10 rounded-full bg-black/70 text-white p-2"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          {currentVis && index !== null && (
            <>
              <button
                type="button"
                onClick={() => onIndexChange((index - 1 + count) % count)}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/70 text-white p-2"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => onIndexChange((index + 1) % count)}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/70 text-white p-2"
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="h-full w-full flex flex-col px-16 py-6 gap-3">
                <div className="grid grid-cols-2 gap-6 flex-1 overflow-hidden">
                  <div className="flex flex-col gap-1 h-full overflow-hidden">
                    <p className="text-xs text-slate-400 uppercase tracking-wide text-center flex-shrink-0">Original</p>
                    <div className="flex-1 flex items-center justify-center overflow-hidden">
                      {originalPhoto ? (
                        <img src={originalPhoto.url} alt="Original room" className="w-full h-full object-contain rounded" />
                      ) : (
                        <div className="text-slate-400 text-sm">Original photo not available</div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 h-full overflow-hidden">
                    <p className="text-xs text-slate-400 uppercase tracking-wide text-center flex-shrink-0">Generated</p>
                    <div className="flex-1 flex items-center justify-center overflow-hidden">
                      <img src={currentVis.output?.url} alt="Generated visualization" className="w-full h-full object-contain rounded" />
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-200 text-center whitespace-pre-wrap break-words px-4 flex-shrink-0">
                  {currentVis.input.prompt}
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
