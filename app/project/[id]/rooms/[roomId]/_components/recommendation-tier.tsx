import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RecommendationItem } from "./recommendation-item";
import type { Recommendation } from "@/lib/types";

interface RecommendationTierProps {
  title: string;
  subtitle: string;
  tier: Recommendation | undefined;
  generating: boolean;
  photos: { storageId: Id<"_storage">; url: string }[];
  onGenerate: () => void;
  onToggle: (args: { id: Id<"recommendations">; itemId: string; selected: boolean }) => void;
  onVisualize: (item: { visualizationPrompt?: string; suggestedPhotoStorageId?: Id<"_storage"> }) => void;
  emptyMessage: string;
}

export function RecommendationTier({
  title,
  subtitle,
  tier,
  generating,
  photos,
  onGenerate,
  onToggle,
  onVisualize,
  emptyMessage,
}: RecommendationTierProps) {
  const isGenerating = generating || tier?.status === "generating";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div>
            <span>{title}</span>
            <p className="text-sm font-normal text-text-tertiary">{subtitle}</p>
          </div>
          {(!tier || tier.status !== "completed") && (
            <Button size="sm" onClick={onGenerate} disabled={isGenerating}>
              {isGenerating ? "Generating..." : "Generate"}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tier?.status === "completed" && tier.items.length > 0 ? (
          <div className="space-y-4">
            {tier.items.map((item) => (
              <RecommendationItem
                key={item.id}
                item={item}
                photos={photos}
                recommendationId={tier._id}
                onToggle={onToggle}
                onVisualize={() => onVisualize(item)}
              />
            ))}
          </div>
        ) : tier?.status === "generating" ? (
          <div className="py-8 text-center">
            <Progress value={50} className="mb-4" />
            <p className="text-text-tertiary">Generating recommendations...</p>
          </div>
        ) : (
          <p className="text-text-tertiary text-center py-8">{emptyMessage}</p>
        )}
      </CardContent>
    </Card>
  );
}
