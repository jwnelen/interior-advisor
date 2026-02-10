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

export default function DashboardPage() {
  const sessionId = useLocalSession();
  const projects = useQuery(
    api.projects.list,
    sessionId ? { sessionId } : "skip"
  );
  const createProject = useMutation(api.projects.create);
  const deleteProject = useMutation(api.projects.remove);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    budget: "",
    rentalFriendly: false,
    petFriendly: false,
    childFriendly: false,
  });

  const handleCreateProject = async () => {
    if (!sessionId || !newProject.name) return;

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
      constraints: {
        rentalFriendly: newProject.rentalFriendly,
        petFriendly: newProject.petFriendly,
        childFriendly: newProject.childFriendly,
        mobilityAccessible: false,
      },
    });

    setNewProject({
      name: "",
      description: "",
      budget: "",
      rentalFriendly: false,
      petFriendly: false,
      childFriendly: false,
    });
    setIsCreateOpen(false);
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-slate-900">
              Interior Advisor
            </Link>
            <Link href="/discover">
              <Button variant="outline">Discover Your Style</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">My Projects</h1>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>New Project</Button>
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
                <div className="space-y-2">
                  <Label>Constraints</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={newProject.rentalFriendly ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        setNewProject({
                          ...newProject,
                          rentalFriendly: !newProject.rentalFriendly,
                        })
                      }
                    >
                      Rental Friendly
                    </Button>
                    <Button
                      type="button"
                      variant={newProject.petFriendly ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        setNewProject({
                          ...newProject,
                          petFriendly: !newProject.petFriendly,
                        })
                      }
                    >
                      Pet Friendly
                    </Button>
                    <Button
                      type="button"
                      variant={newProject.childFriendly ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        setNewProject({
                          ...newProject,
                          childFriendly: !newProject.childFriendly,
                        })
                      }
                    >
                      Child Friendly
                    </Button>
                  </div>
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
            <p className="text-slate-500">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-slate-400 mb-4">
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
              <p className="text-slate-500 mb-4">
                Create your first project to start getting design recommendations
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                Create Your First Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(projects as Project[]).map((project) => (
              <Card key={project._id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{project.name}</span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        project.status === "active"
                          ? "bg-green-100 text-green-800"
                          : project.status === "completed"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {project.status}
                    </span>
                  </CardTitle>
                  {project.description && (
                    <CardDescription>{project.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-slate-600 mb-4">
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
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => deleteProject({ id: project._id })}
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
