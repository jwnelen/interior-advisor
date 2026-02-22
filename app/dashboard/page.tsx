"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useLocalSession } from "@/lib/hooks/use-local-session";
import type { Project } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Navbar } from "@/components/navbar";
import { toast } from "sonner";

// Helper functions for building style profile
const STYLE_COLOR_PALETTES: Record<string, string[]> = {
  modern: ["charcoal gray", "soft white", "walnut wood"],
  scandinavian: ["warm oak", "soft white", "sage green"],
  industrial: ["graphite", "brushed metal", "weathered wood"],
  traditional: ["rich mahogany", "cream", "navy blue"],
  bohemian: ["terracotta", "mustard yellow", "emerald green"],
  minimalist: ["crisp white", "light gray", "natural wood"],
  coastal: ["seafoam", "light sand", "ocean blue"],
  "mid-century": ["teak", "olive green", "burnt orange"],
  eclectic: ["jewel tones", "mixed metals", "vibrant accents"],
  maximalist: ["rich burgundy", "emerald", "gold accents"],
  farmhouse: ["weathered white", "barn wood", "sage"],
};

function deriveColorPreferences(
  primaryStyle: string,
  secondaryStyle: string | undefined
): string[] {
  const palettes = new Set<string>();

  const addPalette = (style: string | undefined) => {
    if (style && STYLE_COLOR_PALETTES[style]) {
      STYLE_COLOR_PALETTES[style].forEach((color) => palettes.add(color));
    }
  };

  addPalette(primaryStyle);
  addPalette(secondaryStyle);

  if (palettes.size === 0) {
    STYLE_COLOR_PALETTES.modern.forEach((color) => palettes.add(color));
  }

  return Array.from(palettes);
}

function derivePriorities(calculatedStyle: {
  emotionalVibe: string;
  decorDensity: string;
  colorPattern: string;
}): string[] {
  const priorities: string[] = [];

  // Emotional Vibe priorities
  if (calculatedStyle.emotionalVibe === "serenity") {
    priorities.push("Calming atmosphere", "Soft lighting");
  } else if (calculatedStyle.emotionalVibe === "energy") {
    priorities.push("Bold statement pieces", "Creative expression");
  } else if (calculatedStyle.emotionalVibe === "cozy") {
    priorities.push("Warmth and comfort", "Inviting textures");
  } else if (calculatedStyle.emotionalVibe === "order") {
    priorities.push("Organization and clarity", "Clean lines");
  }

  // Decor Density priorities
  if (calculatedStyle.decorDensity === "purist") {
    priorities.push("Minimal clutter", "Clear surfaces");
  } else if (calculatedStyle.decorDensity === "curator") {
    priorities.push("Thoughtful styling", "Balanced composition");
  } else if (calculatedStyle.decorDensity === "collector") {
    priorities.push("Personal collections", "Rich layering");
  }

  // Color & Pattern priorities
  if (calculatedStyle.colorPattern === "neutral") {
    priorities.push("Subtle textures", "Neutral palette");
  } else if (calculatedStyle.colorPattern === "natural") {
    priorities.push("Natural materials", "Organic textures");
  } else if (calculatedStyle.colorPattern === "bold") {
    priorities.push("Pattern mixing", "Bold color accents");
  }

  return priorities.slice(0, 4); // Return top 4 priorities
}

export default function DashboardPage() {
  const sessionId = useLocalSession();
  const projects = useQuery(
    api.projects.list,
    sessionId ? { sessionId } : "skip"
  );
  const styleQuiz = useQuery(
    api.styleQuiz.getBySession,
    sessionId ? { sessionId } : "skip"
  );
  const createProject = useMutation(api.projects.create);
  const deleteProject = useMutation(api.projects.remove);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    budget: "",
  });

  const handleCreateProject = async () => {
    if (!sessionId || !newProject.name) return;

    // Ensure user has a style profile
    if (!styleQuiz?.calculatedStyle) {
      toast.error("Please complete the style quiz first", {
        description: "We need to know your style preferences before creating a project",
      });
      return;
    }

    // Build style profile from quiz response
    const styleProfile = {
      primaryStyle: styleQuiz.calculatedStyle.primaryStyle,
      secondaryStyle: styleQuiz.calculatedStyle.secondaryStyle,
      colorPreferences: deriveColorPreferences(
        styleQuiz.calculatedStyle.primaryStyle,
        styleQuiz.calculatedStyle.secondaryStyle
      ),
      priorities: derivePriorities(styleQuiz.calculatedStyle),
    };

    try {
      await createProject({
        sessionId,
        name: newProject.name,
        description: newProject.description || undefined,
        budget: newProject.budget
          ? {
              total: parseFloat(newProject.budget),
              spent: 0,
              currency: "USD",
            }
          : undefined,
        styleProfile,
      });

      setNewProject({
        name: "",
        description: "",
        budget: "",
      });
      setIsCreateOpen(false);
      toast.success("Project created successfully");
    } catch (error) {
      console.error("Failed to create project:", error);
      toast.error("Failed to create project", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    }
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-tertiary">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-page">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {!styleQuiz?.calculatedStyle && (
          <Card className="mb-6 border-primary/50 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="text-primary">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Discover Your Style First</h3>
                  <p className="text-sm text-text-secondary mb-3">
                    Before creating a project, take our quick style quiz to help us provide personalized recommendations.
                  </p>
                  <Link href="/discover">
                    <Button size="sm">Take Style Quiz</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">My Projects</h1>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button disabled={!styleQuiz?.calculatedStyle}>New Project</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Living Room Makeover"
                    value={newProject.name}
                    onChange={(e) =>
                      setNewProject({ ...newProject, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="What are you hoping to achieve?"
                    value={newProject.description}
                    onChange={(e) =>
                      setNewProject({ ...newProject, description: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="budget">Budget (optional)</Label>
                  <Input
                    id="budget"
                    type="number"
                    placeholder="e.g., 5000"
                    value={newProject.budget}
                    onChange={(e) =>
                      setNewProject({ ...newProject, budget: e.target.value })
                    }
                  />
                </div>
                <Button onClick={handleCreateProject} className="w-full">
                  Create Project
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {projects === undefined ? (
          <div className="text-center py-12">
            <p className="text-text-tertiary">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-text-quaternary mb-4">
                <svg
                  className="w-16 h-16 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
              <p className="text-text-tertiary mb-4">
                {styleQuiz?.calculatedStyle
                  ? "Create your first project to start getting design recommendations"
                  : "Take the style quiz first, then create your first project"
                }
              </p>
              {styleQuiz?.calculatedStyle ? (
                <Button onClick={() => setIsCreateOpen(true)}>
                  Create Your First Project
                </Button>
              ) : (
                <Link href="/discover">
                  <Button>Take Style Quiz</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(projects as Project[]).map((project) => (
              <Card key={project._id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>{project.name}</CardTitle>
                  {project.description && (
                    <CardDescription>{project.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-text-secondary mb-4">
                    {project.budget && (
                      <p>
                        Budget: ${project.budget.total.toLocaleString()} (${(
                          project.budget.total - project.budget.spent
                        ).toLocaleString()}{" "}
                        remaining)
                      </p>
                    )}
                    {project.styleProfile && (
                      <p>Style: {project.styleProfile.primaryStyle}</p>
                    )}
                    <p>
                      Created:{" "}
                      {new Date(project.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/project/${project._id}`} className="flex-1">
                      <Button className="w-full">Open</Button>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete project?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete &quot;{project.name}&quot; and all its rooms, photos, analyses, and recommendations. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              try {
                                await deleteProject({ id: project._id, sessionId });
                                toast.success("Project deleted");
                              } catch (error) {
                                console.error("Failed to delete project:", error);
                                toast.error("Failed to delete project", {
                                  description: error instanceof Error ? error.message : "Please try again",
                                });
                              }
                            }}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
