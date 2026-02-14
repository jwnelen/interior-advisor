import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IMPACT_COLORS, DIFFICULTY_LABELS } from "@/lib/constants";

interface RecommendationItemProps {
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
  };
  photos: { storageId: Id<"_storage">; url: string }[];
  recommendationId: Id<"recommendations">;
  onToggle: (args: { id: Id<"recommendations">; itemId: string; selected: boolean }) => void;
  onVisualize: () => void;
}

export function RecommendationItem({
  item,
  photos,
  recommendationId,
  onToggle,
  onVisualize,
}: RecommendationItemProps) {
  const suggestedPhoto = item.suggestedPhotoStorageId
    ? photos.find((p) => p.storageId === item.suggestedPhotoStorageId)
    : null;

  return (
    <div
      className={`border rounded-lg p-4 ${
        item.selected ? "border-status-success bg-status-success/20" : ""
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold">{item.title}</h4>
        <div className="flex gap-1">
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
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          ${item.estimatedCost.min} - ${item.estimatedCost.max}
        </span>
        <div className="flex gap-2">
          {item.visualizationPrompt && (
            <Button size="sm" variant="outline" onClick={onVisualize}>
              Visualize
            </Button>
          )}
          <Button
            size="sm"
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
