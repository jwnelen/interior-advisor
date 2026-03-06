import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IMPACT_COLORS, DIFFICULTY_LABELS } from "@/lib/constants";

interface SuggestedProduct {
  name: string;
  price: string;
  imageUrl: string;
  productUrl: string;
  storeName: string;
  fetchedAt: number;
}

interface RecommendationItemProps {
  productSearchStatus?: "pending" | "searching" | "completed" | "failed";
  item: {
    id: string;
    title: string;
    description: string;
    category: string;
    estimatedCost: { min: number; max: number; currency: string };
    impact: "high" | "medium" | "low";
    difficulty: "diy" | "easy_install" | "professional";
    reasoning: string;
    visualizationPrompt?: string;
    suggestedPhotoStorageId?: Id<"_storage">;
    selected?: boolean;
    suggestedProduct?: SuggestedProduct;
  };
  photos: { storageId: Id<"_storage">; url: string }[];
  recommendationId: Id<"recommendations">;
  onToggle: (args: { id: Id<"recommendations">; itemId: string; selected: boolean }) => void;
  onVisualize: (item: { visualizationPrompt?: string; suggestedPhotoStorageId?: Id<"_storage">; suggestedProduct?: SuggestedProduct }) => void;
}

export function RecommendationItem({
  item,
  photos,
  recommendationId,
  productSearchStatus,
  onToggle,
  onVisualize,
}: RecommendationItemProps) {
  const productSearching = productSearchStatus === "pending" || productSearchStatus === "searching";
  const suggestedPhoto = item.suggestedPhotoStorageId
    ? photos.find((p) => p.storageId === item.suggestedPhotoStorageId)
    : null;

  return (
    <div
      className={`border rounded-lg p-4 ${
        item.selected ? "border-status-success bg-status-success/20" : ""
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
        <h4 className="font-semibold">{item.title}</h4>
        <div className="flex flex-wrap gap-1 shrink-0">
          <Badge className={IMPACT_COLORS[item.impact]}>{item.impact}</Badge>
          <Badge variant="outline">{DIFFICULTY_LABELS[item.difficulty]}</Badge>
        </div>
      </div>
      <div className="flex gap-3 mb-2">
        {suggestedPhoto && (
          <img
            src={suggestedPhoto.url}
            alt=""
            className="w-16 h-12 object-cover rounded flex-shrink-0"
          />
        )}
        <div>
          <p className="text-sm text-text-secondary">{item.description}</p>
          <p className="text-xs text-text-tertiary mt-1">{item.reasoning}</p>
        </div>
      </div>
      {item.suggestedProduct ? (
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3 p-2 rounded-md border bg-muted/40">
          <img
            src={item.suggestedProduct.imageUrl}
            alt={item.suggestedProduct.name}
            className="w-12 h-12 object-contain rounded flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{item.suggestedProduct.name}</p>
            <p className="text-xs text-muted-foreground">{item.suggestedProduct.price}</p>
          </div>
          <a
            href={item.suggestedProduct.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline shrink-0"
          >
            View on {item.suggestedProduct.storeName} ↗
          </a>
        </div>
      ) : productSearching ? (
        <div className="mt-3 flex items-center gap-3 p-2 rounded-md border bg-muted/40 animate-pulse">
          <div className="w-12 h-12 rounded bg-muted flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-muted rounded w-2/3" />
            <div className="h-3 bg-muted rounded w-1/3" />
          </div>
        </div>
      ) : null}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3">
        <span className="text-sm font-medium">
          ${item.estimatedCost.min} - ${item.estimatedCost.max}
        </span>
        <div className="flex w-full sm:w-auto gap-2">
          {item.visualizationPrompt && (
            <Button size="sm" className="flex-1 sm:flex-none" variant="outline" onClick={() => onVisualize(item)}>
              Visualize
            </Button>
          )}
          <Button
            size="sm"
            className="flex-1 sm:flex-none"
            variant={item.selected ? "default" : "outline"}
            onClick={() =>
              onToggle({
                id: recommendationId,
                itemId: item.id,
                selected: !item.selected,
              })
            }
          >
            {item.selected ? "Selected" : "Select"}
          </Button>
        </div>
      </div>
    </div>
  );
}
