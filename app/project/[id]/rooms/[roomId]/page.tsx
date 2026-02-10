"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import type { Recommendation } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { IMPACT_COLORS, DIFFICULTY_LABELS } from "@/lib/constants";

export default function RoomPage() {
  const params = useParams();
  const projectId = params.id as Id<"projects">;
  const roomId = params.roomId as Id<"rooms">;

  const room = useQuery(api.rooms.getPublic, { id: roomId });
  const project = useQuery(api.projects.getPublic, { id: projectId });
  const analysis = useQuery(api.analyses.getByRoom, { roomId });
  const recommendations = useQuery(api.recommendations.getByRoom, { roomId });
  const visualizations = useQuery(api.visualizations.getByRoom, { roomId });
  const completedVisualizations =
    visualizations?.filter((vis) => vis.status === "completed" && vis.output?.url) ?? [];

  const generateUploadUrl = useMutation(api.rooms.generateUploadUrl);
  const addPhoto = useMutation(api.rooms.addPhoto);
  const removePhoto = useMutation(api.rooms.removePhoto);
  const generateRecommendations = useMutation(api.recommendations.generate);
  const generateVisualization = useMutation(api.visualizations.generate);
  const removeVisualization = useMutation(api.visualizations.remove);
  const toggleSelection = useMutation(api.recommendations.toggleItemSelection);

  const generateAnalysis = useMutation(api.analyses.generate);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [generating, setGenerating] = useState<string | null>(null);
  const [analyzingRoom, setAnalyzingRoom] = useState(false);
  const [visualizationPrompt, setVisualizationPrompt] = useState("");
  const [showVisDialog, setShowVisDialog] = useState(false);
  const [selectedRecItem, setSelectedRecItem] = useState<{
    id: string;
    prompt?: string;
  } | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("recommendations");
  const defaultVisualizationPrompt =
    "Add [describe the change]. Keep all other furniture, colors, lighting, and layout identical.";

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (completedVisualizations.length === 0) return;
      if (event.key === "Escape") {
        setLightboxIndex(null);
      } else if (event.key === "ArrowRight") {
        setLightboxIndex((prev) =>
          prev === null ? null : (prev + 1) % completedVisualizations.length
        );
      } else if (event.key === "ArrowLeft") {
        setLightboxIndex((prev) =>
          prev === null
            ? null
            : (prev - 1 + completedVisualizations.length) % completedVisualizations.length
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, completedVisualizations]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress({ current: 0, total: files.length });

    const existingPhotos = room?.photos ?? [];
    let primaryAssigned = existingPhotos.some((photo) => photo.isPrimary);
    let successfulUploads = 0;

    try {
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        try {
          const uploadUrl = await generateUploadUrl();
          const response = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });

          if (!response.ok) {
            throw new Error(`Upload failed with status ${response.status}`);
          }

          const { storageId } = await response.json();
          const shouldSetPrimary = !primaryAssigned && successfulUploads === 0;

          await addPhoto({
            roomId,
            storageId,
            isPrimary: shouldSetPrimary,
          });

          successfulUploads += 1;
          if (shouldSetPrimary) {
            primaryAssigned = true;
          }
        } catch (error) {
          console.error(`Upload failed for ${file.name}:`, error);
        } finally {
          setUploadProgress({ current: index + 1, total: files.length });
        }
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  const handleGenerateAnalysis = async () => {
    setAnalyzingRoom(true);
    try {
      await generateAnalysis({ roomId });
    } catch (error) {
      console.error("Analysis generation failed:", error);
    } finally {
      setAnalyzingRoom(false);
    }
  };

  const handleDeleteVisualization = async (id: Id<"visualizations">) => {
    const confirmed = window.confirm("Delete this visualization? This cannot be undone.");
    if (!confirmed) return;
    try {
      await removeVisualization({ id });
    } catch (error) {
      console.error("Failed to delete visualization:", error);
    }
  };

  const handleGenerateRecommendations = async (tier: "quick_wins" | "transformations") => {
    setGenerating(tier);
    try {
      await generateRecommendations({ roomId, tier });
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateVisualization = async () => {
    if (!selectedRecItem?.prompt && !visualizationPrompt) return;

    try {
      await generateVisualization({
        roomId,
        prompt: selectedRecItem?.prompt || visualizationPrompt,
        type: "full_render",
      });
      setShowVisDialog(false);
      setVisualizationPrompt("");
      setSelectedRecItem(null);
      setActiveTab("visualizations");
    } catch (error) {
      console.error("Visualization failed:", error);
    }
  };

  if (room === undefined || project === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
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
  const analysisIsRunning =
    analysis?.status === "processing" || analysis?.status === "pending";
  const analysisButtonDisabled =
    room.photos.length === 0 || uploading || analyzingRoom || analysisIsRunning;
  const analysisButtonLabel =
    analyzingRoom || analysisIsRunning
      ? "Generating..."
      : analysis?.status === "completed"
      ? "Regenerate Analysis"
      : "Generate Analysis";
  const analysisBadgeLabel =
    analysis === undefined
      ? "loading"
      : analysis === null
      ? "not started"
      : analysis.status;
  const analysisBadgeVariant =
    analysis?.status === "completed"
      ? "default"
      : analysis?.status === "failed"
      ? "destructive"
      : "secondary";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/project/${projectId}`}
              className="text-slate-500 hover:text-slate-900"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <div>
              <p className="text-sm text-slate-500">{project.name}</p>
              <h1 className="text-2xl font-bold">{room.name}</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Photos */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Photos</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading
                      ? uploadProgress.total > 1
                        ? `Uploading ${uploadProgress.current}/${uploadProgress.total}`
                        : "Uploading..."
                      : "Add Photos"}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                {room.photos.length === 0 ? (
                  <div
                    className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-slate-200 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="text-center text-slate-400">
                      <svg
                        className="w-12 h-12 mx-auto mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      <p>Click to upload photos</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Primary Photo */}
                    <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden relative group">
                      <img
                        src={
                          room.photos.find((p) => p.isPrimary)?.url ||
                          room.photos[0].url
                        }
                        alt={room.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2">
                        <Badge>Primary</Badge>
                      </div>
                    </div>
                    {/* Other Photos */}
                    {room.photos.length > 1 && (
                      <div className="grid grid-cols-3 gap-2">
                        {room.photos
                          .filter((p) => !p.isPrimary)
                          .map((photo) => (
                            <div
                              key={photo.storageId}
                              className="aspect-square bg-slate-100 rounded overflow-hidden relative group"
                            >
                              <img
                                src={photo.url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                              <button
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() =>
                                  removePhoto({
                                    roomId,
                                    storageId: photo.storageId,
                                  })
                                }
                              >
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Analysis Card */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Analysis</span>
                  <Badge variant={analysisBadgeVariant}>{analysisBadgeLabel}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analysis === undefined ? (
                  <p className="text-sm text-slate-500">
                    Checking analysis status...
                  </p>
                ) : analysis === null ? (
                  <p className="text-sm text-slate-500">
                    No analysis yet. Upload photos and generate when you are ready.
                  </p>
                ) : analysis.status === "processing" || analysis.status === "pending" ? (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-500">
                      {analysis.status === "pending"
                        ? "Queued for analysis..."
                        : "Analyzing your room..."}
                    </p>
                    <Progress value={50} />
                  </div>
                ) : analysis.status === "completed" && analysis.results ? (
                  <div className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-medium mb-1">Detected Style</h4>
                      <p className="capitalize">
                        {analysis.results.style.detected} (
                        {Math.round(analysis.results.style.confidence * 100)}%
                        confidence)
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Color Palette</h4>
                      <p className="capitalize">{analysis.results.colors.palette}</p>
                      <div className="flex gap-1 mt-1">
                        {analysis.results.colors.dominant.map((color, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-slate-100 rounded text-xs"
                          >
                            {color}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Lighting</h4>
                      <p className="capitalize">
                        {analysis.results.lighting.natural} natural light
                      </p>
                      <p className="text-slate-500">
                        {analysis.results.lighting.assessment}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">
                        Furniture ({analysis.results.furniture.length} items)
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {analysis.results.furniture.map((item, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-slate-100 rounded text-xs"
                          >
                            {item.item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : analysis.status === "failed" ? (
                  <p className="text-red-500 text-sm">{analysis.error}</p>
                ) : null}
                <Button
                  className="mt-4 w-full"
                  onClick={handleGenerateAnalysis}
                  disabled={analysisButtonDisabled}
                >
                  {analysisButtonLabel}
                </Button>
                {room.photos.length === 0 && (
                  <p className="text-xs text-slate-500 mt-2">
                    Add at least one photo to enable analysis.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Recommendations & Visualizations */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                <TabsTrigger value="recommendations" className="flex-1">
                  Recommendations
                </TabsTrigger>
                <TabsTrigger value="visualizations" className="flex-1">
                  Visualizations
                </TabsTrigger>
              </TabsList>

              <TabsContent value="recommendations" className="mt-6">
                {!analysis || analysis.status !== "completed" ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-slate-500 mb-4">
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
                    {/* Quick Wins */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div>
                            <span>Quick Wins</span>
                            <p className="text-sm font-normal text-slate-500">
                              Budget-friendly changes under $200
                            </p>
                          </div>
                          {(!quickWins || quickWins.status !== "completed") && (
                            <Button
                              size="sm"
                              onClick={() => handleGenerateRecommendations("quick_wins")}
                              disabled={generating === "quick_wins"}
                            >
                              {generating === "quick_wins"
                                ? "Generating..."
                                : quickWins?.status === "generating"
                                ? "Generating..."
                                : "Generate"}
                            </Button>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {quickWins?.status === "completed" && quickWins.items.length > 0 ? (
                          <div className="space-y-4">
                            {quickWins.items.map((item) => (
                              <RecommendationItem
                                key={item.id}
                                item={item}
                                recommendationId={quickWins._id}
                                onToggle={toggleSelection}
                                onVisualize={() => {
                                  setSelectedRecItem({
                                    id: item.id,
                                    prompt: item.visualizationPrompt,
                                  });
                                  setVisualizationPrompt(item.visualizationPrompt || defaultVisualizationPrompt);
                                  setShowVisDialog(true);
                                }}
                              />
                            ))}
                          </div>
                        ) : quickWins?.status === "generating" ? (
                          <div className="py-8 text-center">
                            <Progress value={50} className="mb-4" />
                            <p className="text-slate-500">Generating recommendations...</p>
                          </div>
                        ) : (
                          <p className="text-slate-500 text-center py-8">
                            Click Generate to get quick win recommendations
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Transformations */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div>
                            <span>Transformations</span>
                            <p className="text-sm font-normal text-slate-500">
                              Larger investments $200-$2000
                            </p>
                          </div>
                          {(!transformations || transformations.status !== "completed") && (
                            <Button
                              size="sm"
                              onClick={() => handleGenerateRecommendations("transformations")}
                              disabled={generating === "transformations"}
                            >
                              {generating === "transformations"
                                ? "Generating..."
                                : transformations?.status === "generating"
                                ? "Generating..."
                                : "Generate"}
                            </Button>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {transformations?.status === "completed" &&
                        transformations.items.length > 0 ? (
                          <div className="space-y-4">
                            {transformations.items.map((item) => (
                              <RecommendationItem
                                key={item.id}
                                item={item}
                                recommendationId={transformations._id}
                                onToggle={toggleSelection}
                                onVisualize={() => {
                                  setSelectedRecItem({
                                    id: item.id,
                                    prompt: item.visualizationPrompt,
                                  });
                                  setVisualizationPrompt(item.visualizationPrompt || defaultVisualizationPrompt);
                                  setShowVisDialog(true);
                                }}
                              />
                            ))}
                          </div>
                        ) : transformations?.status === "generating" ? (
                          <div className="py-8 text-center">
                            <Progress value={50} className="mb-4" />
                            <p className="text-slate-500">Generating recommendations...</p>
                          </div>
                        ) : (
                          <p className="text-slate-500 text-center py-8">
                            Click Generate to get transformation recommendations
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="visualizations" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Generated Visualizations</span>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedRecItem(null);
                          setVisualizationPrompt(defaultVisualizationPrompt);
                          setShowVisDialog(true);
                        }}
                        disabled={room.photos.length === 0}
                      >
                        New Visualization
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {visualizations && visualizations.length > 0 ? (
                      <div className="grid md:grid-cols-2 gap-4">
                        {visualizations.map((vis) => (
                          <div
                            key={vis._id}
                            className="border rounded-lg overflow-hidden"
                          >
                            {vis.status === "completed" && vis.output ? (
                              <div className="relative group">
                                <img
                                  src={vis.output.url}
                                  alt="Visualization"
                                  className="w-full aspect-video object-cover"
                                />
                                <button
                                  type="button"
                                  className="absolute top-2 right-2 rounded-full bg-black/60 text-white p-1.5 opacity-0 group-hover:opacity-100 transition"
                                  onClick={() =>
                                    setLightboxIndex(
                                      completedVisualizations.findIndex((item) => item._id === vis._id)
                                    )
                                  }
                                  aria-label="Open full screen"
                                >
                                  <Maximize2 className="h-4 w-4" />
                                </button>
                              </div>
                            ) : vis.status === "processing" ? (
                              <div className="aspect-video bg-slate-100 flex items-center justify-center">
                                <div className="text-center">
                                  <Progress value={50} className="w-32 mb-2" />
                                  <p className="text-sm text-slate-500">Generating...</p>
                                </div>
                              </div>
                            ) : (
                              <div className="aspect-video bg-red-50 flex flex-col items-center justify-center px-4 text-center">
                                <p className="text-sm text-red-500 font-medium">Failed</p>
                                {vis.error && (
                                  <p className="text-xs text-red-500 mt-1 line-clamp-3">
                                    {vis.error}
                                  </p>
                                )}
                              </div>
                            )}
                            <div className="p-3">
                              <div className="flex items-start justify-between gap-3">
                                <p className="text-sm text-slate-600 whitespace-pre-wrap break-words">
                                  {vis.input.prompt}
                                </p>
                                <Button
                                  size="xs"
                                  variant="destructive"
                                  onClick={() => handleDeleteVisualization(vis._id)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-center py-8">
                        No visualizations yet. Generate one from recommendations or create a custom one.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {/* Visualization Dialog */}
      <Dialog open={showVisDialog} onOpenChange={setShowVisDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Visualization</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="prompt">Describe only the changes (keep everything else the same)</Label>
              <Input
                id="prompt"
                placeholder={defaultVisualizationPrompt}
                value={visualizationPrompt}
                onChange={(e) => setVisualizationPrompt(e.target.value)}
              />
            </div>
            <Button
              onClick={handleGenerateVisualization}
              className="w-full"
              disabled={!visualizationPrompt}
            >
              Generate Visualization
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      <Dialog open={lightboxIndex !== null} onOpenChange={(open) => !open && setLightboxIndex(null)}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0">
          <div className="relative h-full w-full bg-black">
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="absolute top-3 right-3 z-10 rounded-full bg-black/70 text-white p-2"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            {completedVisualizations.length > 0 && lightboxIndex !== null ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setLightboxIndex(
                      (lightboxIndex - 1 + completedVisualizations.length) % completedVisualizations.length
                    )
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/70 text-white p-2"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setLightboxIndex(
                      (lightboxIndex + 1) % completedVisualizations.length
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/70 text-white p-2"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="h-full w-full flex flex-col items-center justify-center gap-4 px-6 py-8">
                  <img
                    src={completedVisualizations[lightboxIndex]?.output?.url}
                    alt="Visualization"
                    className="max-h-[70vh] max-w-full object-contain"
                  />
                  <p className="text-sm text-slate-200 text-center whitespace-pre-wrap break-words max-w-4xl">
                    {completedVisualizations[lightboxIndex]?.input.prompt}
                  </p>
                </div>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
    selected?: boolean;
  };
  recommendationId: Id<"recommendations">;
  onToggle: (args: { id: Id<"recommendations">; itemId: string; selected: boolean }) => void;
  onVisualize: () => void;
}

function RecommendationItem({
  item,
  recommendationId,
  onToggle,
  onVisualize,
}: RecommendationItemProps) {
  return (
    <div
      className={`border rounded-lg p-4 ${
        item.selected ? "border-green-500 bg-green-50" : ""
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold">{item.title}</h4>
        <div className="flex gap-1">
          <Badge className={IMPACT_COLORS[item.impact]}>{item.impact}</Badge>
          <Badge variant="outline">{DIFFICULTY_LABELS[item.difficulty]}</Badge>
        </div>
      </div>
      <p className="text-sm text-slate-600 mb-2">{item.description}</p>
      <p className="text-xs text-slate-500 mb-3">{item.reasoning}</p>
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
