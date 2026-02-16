import { useState } from "react";
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
} from "@/components/ui/alert-dialog";
import { RecommendationItem } from "./recommendation-item";
import type { Recommendation } from "@/lib/types";

interface RecommendationTierProps {
  title: string;
  subtitle: string;
  tier: Recommendation | undefined;
  generating: boolean;
  photos: { storageId: Id<"_storage">; url: string }[];
  onGenerate: () => void;
  onRegenerate: () => void;
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
  onRegenerate,
  onToggle,
  onVisualize,
  emptyMessage,
}: RecommendationTierProps) {
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const isGenerating = generating || tier?.status === "generating";
  const hasCompletedRecommendations = tier?.status === "completed" && tier.items.length > 0;

  const handleRegenerateConfirm = () => {
    setShowRegenerateDialog(false);
    onRegenerate();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div>
              <span>{title}</span>
              <p className="text-sm font-normal text-text-tertiary">{subtitle}</p>
            </div>
            <div className="flex gap-2">
              {!tier || tier.status === "failed" ? (
                <Button size="sm" onClick={onGenerate} disabled={isGenerating}>
                  {isGenerating ? "Generating..." : tier?.status === "failed" ? "Retry" : "Generate"}
                </Button>
              ) : tier.status === "completed" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowRegenerateDialog(true)}
                  disabled={isGenerating}
                >
                  <svg
                    className="w-4 h-4 mr-1.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Regenerate
                </Button>
              ) : null}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasCompletedRecommendations ? (
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
          ) : tier?.status === "failed" ? (
            <div className="py-8 space-y-4">
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-destructive text-sm font-medium mb-1">Failed to generate recommendations</p>
                <p className="text-destructive/80 text-sm">{tier.error || "Unknown error"}</p>
              </div>
            </div>
          ) : (
            <p className="text-text-tertiary text-center py-8">{emptyMessage}</p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Recommendations?</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a fresh set of recommendations for this tier. Your current recommendations will be replaced.
              Any visualizations you&apos;ve created will still be available in the Visualizations tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRegenerateConfirm}>
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
