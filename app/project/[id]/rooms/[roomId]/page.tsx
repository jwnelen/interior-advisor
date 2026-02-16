"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import type { Recommendation } from "@/lib/types";
import { downscaleImage } from "@/lib/utils";
import { useLocalSession } from "@/lib/hooks/use-local-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PhotoSection } from "./_components/photo-section";
import { AnalysisCard } from "./_components/analysis-card";
import { RecommendationTier } from "./_components/recommendation-tier";
import { CustomQuestionSection } from "./_components/custom-question-section";
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
  const sessionId = useLocalSession();

  const room = useQuery(api.rooms.getPublic, sessionId ? { id: roomId, sessionId } : "skip");
  const project = useQuery(api.projects.getPublic, sessionId ? { id: projectId, sessionId } : "skip");
  const analysis = useQuery(api.analyses.getByRoom, { roomId });
  const recommendations = useQuery(api.recommendations.getByRoom, { roomId });
  const customQuestions = useQuery(api.recommendations.getCustomQuestions, { roomId });
  const visualizations = useQuery(api.visualizations.getByRoom, { roomId });
  const completedVisualizations =
    visualizations?.filter((vis) => vis.status === "completed" && vis.output?.url) ?? [];

  const generateUploadUrl = useMutation(api.rooms.generateUploadUrl);
  const addPhoto = useMutation(api.rooms.addPhoto);
  const removePhoto = useMutation(api.rooms.removePhoto);
  const generateAnalysis = useMutation(api.analyses.generate);
  const generateRecommendations = useMutation(api.recommendations.generate);
  const regenerateRecommendations = useMutation(api.recommendations.regenerate);
  const askCustomQuestion = useMutation(api.recommendations.askCustomQuestion);
  const deleteCustomQuestion = useMutation(api.recommendations.deleteCustomQuestion);
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
          if (!sessionId) throw new Error("Session not found");
          await addPhoto({ roomId, sessionId, storageId });
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
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  const handleGenerateAnalysis = async () => {
    if (!sessionId) return;
    setAnalyzingRoom(true);
    try {
      await generateAnalysis({ roomId, sessionId });
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
    if (!sessionId) return;
    setGenerating(tier);
    try {
      await generateRecommendations({ roomId, tier, sessionId });
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

  const handleRegenerateRecommendations = async (tier: "quick_wins" | "transformations") => {
    setGenerating(tier);
    try {
      await regenerateRecommendations({ roomId, tier });
    } finally {
      setGenerating(null);
    }
  };

  const handleAskQuestion = async (question: string) => {
    await askCustomQuestion({ roomId, question });
  };

  const handleDeleteQuestion = async (id: Id<"recommendations">) => {
    if (!window.confirm("Delete this question and answer?")) return;
    try {
      await deleteCustomQuestion({ id });
    } catch (error) {
      console.error("Failed to delete question:", error);
    }
  };

  const handleGenerateVisualization = async () => {
    if (!visualizationPrompt || !sessionId) return;
    try {
      await generateVisualization({
        roomId,
        prompt: visualizationPrompt,
        type: "full_render",
        photoStorageId: selectedPhotoStorageId ?? undefined,
        sessionId,
      });
      setShowVisDialog(false);
      setVisualizationPrompt("");
      setSelectedPhotoStorageId(null);
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
  }) => {
    setVisualizationPrompt(item?.visualizationPrompt || DEFAULT_VIS_PROMPT);
    setSelectedPhotoStorageId(item?.suggestedPhotoStorageId ?? room?.photos[0]?.storageId ?? null);
    setShowVisDialog(true);
  };

  if (room === undefined || project === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-tertiary">Loading...</p>
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
  const analysisIsRunning = analysis?.status === "processing" || analysis?.status === "pending";
  const analysisButtonDisabled = room.photos.length === 0 || uploading || analyzingRoom || analysisIsRunning;
  const analysisButtonLabel = analyzingRoom || analysisIsRunning
    ? "Generating..."
    : analysis?.status === "completed"
      ? "Regenerate Analysis"
      : "Generate Analysis";

  return (
    <div className="min-h-screen bg-surface-page">
      <header className="bg-surface-elevated border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/project/${projectId}`} className="text-text-tertiary hover:text-text-primary">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <p className="text-sm text-text-tertiary">{project.name}</p>
                <h1 className="text-2xl font-bold">{room.name}</h1>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
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
                if (!sessionId) return;
                removePhoto({ ...args, sessionId });
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
              <TabsList className="w-full">
                <TabsTrigger value="recommendations" className="flex-1">Recommendations</TabsTrigger>
                <TabsTrigger value="visualizations" className="flex-1">Visualizations</TabsTrigger>
              </TabsList>

              <TabsContent value="recommendations" className="mt-6">
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
                      onRegenerate={() => handleRegenerateRecommendations("quick_wins")}
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
                      onRegenerate={() => handleRegenerateRecommendations("transformations")}
                      onToggle={toggleSelection}
                      onVisualize={openVisualizationDialog}
                      emptyMessage="Click Generate to get transformation recommendations"
                    />

                    {/* Custom Question Section */}
                    <CustomQuestionSection
                      roomId={roomId}
                      customQuestions={customQuestions ?? []}
                      photos={room.photos}
                      onAskQuestion={handleAskQuestion}
                      onDeleteQuestion={handleDeleteQuestion}
                      onToggle={toggleSelection}
                      onVisualize={openVisualizationDialog}
                    />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="visualizations" className="mt-6">
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

      <VisualizationDialog
        open={showVisDialog}
        onOpenChange={setShowVisDialog}
        photos={room.photos}
        selectedPhotoStorageId={selectedPhotoStorageId}
        onSelectPhoto={setSelectedPhotoStorageId}
        prompt={visualizationPrompt}
        onPromptChange={setVisualizationPrompt}
        onGenerate={handleGenerateVisualization}
        defaultPrompt={DEFAULT_VIS_PROMPT}
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
