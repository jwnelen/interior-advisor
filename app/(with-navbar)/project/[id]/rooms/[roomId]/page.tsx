"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import type { Recommendation } from "@/lib/types";
import { downscaleImage } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PhotoSection } from "./_components/photo-section";
import { AnalysisCard } from "./_components/analysis-card";
import { RecommendationTier } from "./_components/recommendation-tier";
import { VisualizationsTab } from "./_components/visualizations-tab";
import { VisualizationDialog } from "./_components/visualization-dialog";
import { Lightbox } from "./_components/lightbox";
import { toast } from "sonner";

const DEFAULT_VIS_PROMPT =
  "Add [describe the change]. Keep all other furniture, colors, lighting, and layout identical.";

export default function RoomPage() {
  const params = useParams();
  const projectId = params.id as Id<"projects">;
  const roomId = params.roomId as Id<"rooms">;
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/sign-in");
    }
  }, [session, isPending, router]);

  const room = useQuery(api.rooms.getPublic, session ? { id: roomId } : "skip");
  const project = useQuery(api.projects.getPublic, session ? { id: projectId } : "skip");
  const analysis = useQuery(api.analyses.getByRoom, session ? { roomId } : "skip");
  const recommendations = useQuery(api.recommendations.getByRoom, session ? { roomId } : "skip");
  const visualizations = useQuery(api.visualizations.getByRoom, session ? { roomId } : "skip");
  const completedVisualizations =
    visualizations?.filter((vis) => vis.status === "completed" && vis.output?.url) ?? [];

  const generateUploadUrl = useMutation(api.rooms.generateUploadUrl);
  const addPhoto = useMutation(api.rooms.addPhoto);
  const removePhoto = useMutation(api.rooms.removePhoto);
  const generateAnalysis = useMutation(api.analyses.generate);
  const generateRecommendations = useMutation(api.recommendations.generate);
  const regenerateRecommendations = useMutation(api.recommendations.regenerate);
  const generateVisualization = useMutation(api.visualizations.generate);
  const removeVisualization = useMutation(api.visualizations.remove);
  const toggleSelection = useMutation(api.recommendations.toggleItemSelection);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [generating, setGenerating] = useState<string | null>(null);
  const [analyzingRoom, setAnalyzingRoom] = useState(false);
  const [visualizationPrompt, setVisualizationPrompt] = useState("");
  const [showVisDialog, setShowVisDialog] = useState(false);
  const [selectedPhotoStorageId, setSelectedPhotoStorageId] = useState<Id<"_storage"> | null>(null);
  const [productImageUrl, setProductImageUrl] = useState<string | null>(null);
  const [productForDialog, setProductForDialog] = useState<{ name: string; price: string; imageUrl: string; productUrl: string; storeName: string } | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("recommendations");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress({ current: 0, total: files.length });
    let successCount = 0;
    let failCount = 0;

    try {
      for (let index = 0; index < files.length; index++) {
        try {
          const resized = await downscaleImage(files[index]);
          const uploadUrl = await generateUploadUrl();
          const response = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": "image/jpeg" },
            body: resized,
          });
          if (!response.ok) throw new Error(`Upload failed with status ${response.status}`);
          const { storageId } = await response.json();
          await addPhoto({ roomId, storageId });
          successCount++;
        } catch (error) {
          failCount++;
          console.error(`Upload failed for ${files[index].name}:`, error);
          toast.error(`Failed to upload ${files[index].name}`, {
            description: error instanceof Error ? error.message : "Unknown error",
          });
        } finally {
          setUploadProgress({ current: index + 1, total: files.length });
        }
      }

      // Show success message after all uploads complete
      if (successCount > 0) {
        toast.success(`Uploaded ${successCount} photo${successCount > 1 ? 's' : ''} successfully`);
      }
      if (failCount > 0) {
        toast.error(`${failCount} photo${failCount > 1 ? "s" : ""} failed to upload`);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  const handleGenerateAnalysis = async () => {
    setAnalyzingRoom(true);
    try {
      await generateAnalysis({ roomId });
      toast.success("Analysis started", {
        description: "We're analyzing your room photos. This may take a minute.",
      });
    } catch (error) {
      console.error("Analysis generation failed:", error);
      toast.error("Failed to start analysis", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setAnalyzingRoom(false);
    }
  };

  const handleGenerateRecommendations = async (tier: "quick_wins" | "transformations") => {
    setGenerating(tier);
    try {
      await generateRecommendations({ roomId, tier });
      toast.success("Generating recommendations", {
        description: `Creating ${tier === "quick_wins" ? "quick win" : "transformation"} suggestions...`,
      });
    } catch (error) {
      console.error("Recommendation generation failed:", error);
      toast.error("Failed to generate recommendations", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setGenerating(null);
    }
  };

  const handleRegenerateRecommendations = async (tier: "quick_wins" | "transformations", note?: string) => {
    setGenerating(tier);
    try {
      await regenerateRecommendations({ roomId, tier, userNote: note });
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateVisualization = async (includeProduct: boolean) => {
    if (!visualizationPrompt) return;
    try {
      await generateVisualization({
        roomId,
        prompt: visualizationPrompt,
        type: "full_render",
        photoStorageId: selectedPhotoStorageId ?? undefined,
        productImageUrl: includeProduct ? (productImageUrl ?? undefined) : undefined,
        suggestedProduct: includeProduct ? (productForDialog ?? undefined) : undefined,
      });
      setShowVisDialog(false);
      setVisualizationPrompt("");
      setSelectedPhotoStorageId(null);
      setProductImageUrl(null);
      setProductForDialog(null);
      setActiveTab("visualizations");
      toast.success("Visualization queued", {
        description: "Your room transformation is being generated. This may take a minute.",
      });
    } catch (error) {
      console.error("Visualization failed:", error);
      toast.error("Failed to create visualization", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    }
  };

  const handleDeleteVisualization = async (id: Id<"visualizations">) => {
    try {
      await removeVisualization({ id });
      toast.success("Visualization deleted");
    } catch (error) {
      console.error("Failed to delete visualization:", error);
      toast.error("Failed to delete visualization", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    }
  };

  const openVisualizationDialog = (item?: {
    visualizationPrompt?: string;
    suggestedPhotoStorageId?: Id<"_storage">;
    suggestedProduct?: { name: string; price: string; imageUrl: string; productUrl: string; storeName: string; fetchedAt: number };
  }) => {
    let prompt = item?.visualizationPrompt || DEFAULT_VIS_PROMPT;
    if (item?.suggestedProduct && item.visualizationPrompt) {
      prompt = `${item.visualizationPrompt} Use the product "${item.suggestedProduct.name}" (${item.suggestedProduct.price}) from ${item.suggestedProduct.storeName}.`;
    }
    setVisualizationPrompt(prompt);
    setSelectedPhotoStorageId(item?.suggestedPhotoStorageId ?? room?.photos[0]?.storageId ?? null);
    const product = item?.suggestedProduct ?? null;
    setProductImageUrl(product?.imageUrl ?? null);
    setProductForDialog(product ? { name: product.name, price: product.price, imageUrl: product.imageUrl, productUrl: product.productUrl, storeName: product.storeName } : null);
    setShowVisDialog(true);
  };

  if (isPending || !session || room === undefined || project === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
      </div>
    );
  }

  if (room === null || project === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Room Not Found</h1>
          <Link href={`/project/${projectId}`}>
            <Button>Back to Project</Button>
          </Link>
        </div>
      </div>
    );
  }

  const quickWins = (recommendations as Recommendation[] | undefined)?.find((r) => r.tier === "quick_wins");
  const transformations = (recommendations as Recommendation[] | undefined)?.find((r) => r.tier === "transformations");

  const allSelectedItems = [
    ...(quickWins?.items ?? []).filter((item) => item.selected).map((item) => ({ ...item, recommendationId: quickWins!._id })),
    ...(transformations?.items ?? []).filter((item) => item.selected).map((item) => ({ ...item, recommendationId: transformations!._id })),
  ];

  const openCombinedVisualizationDialog = () => {
    const promptLines = allSelectedItems
      .filter((item) => item.visualizationPrompt)
      .map((item, i) => {
        let line = `${i + 1}. ${item.visualizationPrompt}`;
        if (item.suggestedProduct) {
          line += ` Use the product "${item.suggestedProduct.name}" (${item.suggestedProduct.price}) from ${item.suggestedProduct.storeName}.`;
        }
        return line;
      });

    const combinedPrompt =
      promptLines.length > 0
        ? `Make the following changes:\n${promptLines.join("\n")}`
        : DEFAULT_VIS_PROMPT;

    const firstPhotoId =
      allSelectedItems.find((item) => item.suggestedPhotoStorageId)?.suggestedPhotoStorageId ??
      room.photos[0]?.storageId ?? null;

    setVisualizationPrompt(combinedPrompt);
    setSelectedPhotoStorageId(firstPhotoId);
    setProductImageUrl(null);
    setProductForDialog(null);
    setShowVisDialog(true);
  };

  const analysisIsRunning = analysis?.status === "processing" || analysis?.status === "pending";
  const analysisButtonDisabled = room.photos.length === 0 || uploading || analyzingRoom || analysisIsRunning;
  const analysisButtonLabel = analyzingRoom || analysisIsRunning
    ? "Generating..."
    : analysis?.status === "completed"
      ? "Regenerate Analysis"
      : "Generate Analysis";

  return (
    <div className="min-h-screen bg-surface-page">

      <main className="container mx-auto px-3 sm:px-4 py-4 md:py-8">
        {/* Page header */}
        <div className="flex items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Link href={`/project/${projectId}`} className="text-text-tertiary hover:text-text-primary mt-0.5 sm:mt-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <p className="text-sm text-text-tertiary">{project.name}</p>
            <h1 className="text-xl sm:text-2xl font-bold">{room.name}</h1>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
          <div className="lg:col-span-1">
            <PhotoSection
              photos={room.photos}
              roomName={room.name}
              roomId={roomId}
              uploading={uploading}
              uploadProgress={uploadProgress}
              fileInputRef={fileInputRef}
              onFileUpload={handleFileUpload}
              onRemovePhoto={(args) => {
                removePhoto(args);
              }}
            />
            <AnalysisCard
              analysis={analysis}
              onGenerate={handleGenerateAnalysis}
              disabled={analysisButtonDisabled}
              buttonLabel={analysisButtonLabel}
              hasPhotos={room.photos.length > 0}
            />
          </div>

          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full h-auto">
                <TabsTrigger value="recommendations" className="flex-1 text-xs sm:text-sm">Recommendations</TabsTrigger>
                <TabsTrigger value="visualizations" className="flex-1 text-xs sm:text-sm">Visualizations</TabsTrigger>
              </TabsList>

              <TabsContent value="recommendations" className="mt-4 sm:mt-6">
                {!analysis || analysis.status !== "completed" ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-text-tertiary mb-4">
                        {!analysis
                          ? "Upload a photo to get started with analysis"
                          : analysis.status === "processing"
                            ? "Waiting for analysis to complete..."
                            : "Analysis failed. Please try uploading a new photo."}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    <RecommendationTier
                      title="Quick Wins"
                      subtitle="Budget-friendly changes under $200"
                      tier={quickWins}
                      generating={generating === "quick_wins"}
                      photos={room.photos}
                      onGenerate={() => handleGenerateRecommendations("quick_wins")}
                      onRegenerate={(note) => handleRegenerateRecommendations("quick_wins", note)}
                      onToggle={toggleSelection}
                      onVisualize={openVisualizationDialog}
                      emptyMessage="Click Generate to get quick win recommendations"
                    />
                    <RecommendationTier
                      title="Transformations"
                      subtitle="Larger investments $200-$2000"
                      tier={transformations}
                      generating={generating === "transformations"}
                      photos={room.photos}
                      onGenerate={() => handleGenerateRecommendations("transformations")}
                      onRegenerate={(note) => handleRegenerateRecommendations("transformations", note)}
                      onToggle={toggleSelection}
                      onVisualize={openVisualizationDialog}
                      emptyMessage="Click Generate to get transformation recommendations"
                    />

                  </div>
                )}
              </TabsContent>

              <TabsContent value="visualizations" className="mt-4 sm:mt-6">
                <VisualizationsTab
                  visualizations={visualizations}
                  completedVisualizations={completedVisualizations}
                  roomHasPhotos={room.photos.length > 0}
                  onOpenLightbox={setLightboxIndex}
                  onDelete={handleDeleteVisualization}
                  onNewVisualization={() => openVisualizationDialog()}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {allSelectedItems.length >= 1 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <p className="text-sm text-text-secondary">
              <span className="font-medium text-text-primary">{allSelectedItems.length}</span>{" "}
              {allSelectedItems.length === 1 ? "item" : "items"} selected
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  allSelectedItems.forEach((item) =>
                    toggleSelection({ id: item.recommendationId, itemId: item.id, selected: false })
                  );
                }}
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={openCombinedVisualizationDialog}
              >
                {allSelectedItems.length === 1 ? "Visualize selected" : "Visualize together"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <VisualizationDialog
        key={productForDialog?.imageUrl ?? "no-product"}
        open={showVisDialog}
        onOpenChange={setShowVisDialog}
        photos={room.photos}
        selectedPhotoStorageId={selectedPhotoStorageId}
        onSelectPhoto={setSelectedPhotoStorageId}
        prompt={visualizationPrompt}
        onPromptChange={setVisualizationPrompt}
        onGenerate={handleGenerateVisualization}
        defaultPrompt={DEFAULT_VIS_PROMPT}
        suggestedProduct={productForDialog ?? undefined}
      />

      <Lightbox
        visualizations={completedVisualizations}
        index={lightboxIndex}
        photos={room.photos}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
}
