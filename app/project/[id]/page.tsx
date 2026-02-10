"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import type { Room } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ROOM_TYPES } from "@/lib/constants";

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id as Id<"projects">;

  const project = useQuery(api.projects.getPublic, { id: projectId });
  const rooms = useQuery(api.rooms.list, { projectId });
  const createRoom = useMutation(api.rooms.create);
  const deleteRoom = useMutation(api.rooms.remove);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: "",
    type: "",
    notes: "",
  });

  const handleCreateRoom = async () => {
    if (!newRoom.name || !newRoom.type) return;

    await createRoom({
      projectId,
      name: newRoom.name,
      type: newRoom.type,
      notes: newRoom.notes || undefined,
    });

    setNewRoom({ name: "", type: "", notes: "" });
    setIsCreateOpen(false);
  };

  if (project === undefined || rooms === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (project === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Project Not Found</h1>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-slate-500 hover:text-slate-900">
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
                <h1 className="text-2xl font-bold">{project.name}</h1>
                {project.description && (
                  <p className="text-sm text-slate-500">{project.description}</p>
                )}
              </div>
            </div>
            {project.budget && (
              <div className="text-right">
                <p className="text-sm text-slate-500">Budget</p>
                <p className="font-semibold">
                  ${project.budget.total.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Project Info */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {project.styleProfile && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-500">Style Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold capitalize">
                  {project.styleProfile.primaryStyle}
                </p>
                {project.styleProfile.secondaryStyle && (
                  <p className="text-sm text-slate-600 capitalize">
                    + {project.styleProfile.secondaryStyle}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
          {project.constraints && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-500">Constraints</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {project.constraints.rentalFriendly && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Rental
                    </span>
                  )}
                  {project.constraints.petFriendly && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Pet
                    </span>
                  )}
                  {project.constraints.childFriendly && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      Child
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-500">Rooms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{rooms.length} rooms</p>
            </CardContent>
          </Card>
        </div>

        {/* Rooms Section */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Rooms</h2>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>Add Room</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Room</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="roomName">Room Name</Label>
                  <Input
                    id="roomName"
                    placeholder="e.g., Living Room"
                    value={newRoom.name}
                    onChange={(e) =>
                      setNewRoom({ ...newRoom, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="roomType">Room Type</Label>
                  <Select
                    value={newRoom.type}
                    onValueChange={(value) =>
                      setNewRoom({ ...newRoom, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select room type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="roomNotes">Notes (optional)</Label>
                  <Textarea
                    id="roomNotes"
                    placeholder="Any specific concerns or goals for this room?"
                    value={newRoom.notes}
                    onChange={(e) =>
                      setNewRoom({ ...newRoom, notes: e.target.value })
                    }
                  />
                </div>
                <Button onClick={handleCreateRoom} className="w-full">
                  Add Room
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {rooms.length === 0 ? (
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
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">No rooms yet</h3>
              <p className="text-slate-500 mb-4">
                Add rooms to your project to start getting design recommendations
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>Add Your First Room</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(rooms as Room[]).map((room) => (
              <Card key={room._id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{room.name}</span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded capitalize">
                      {room.type.replace("_", " ")}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {room.photos.length > 0 ? (
                    <div className="aspect-video bg-slate-100 rounded-lg mb-4 overflow-hidden">
                      <img
                        src={room.photos.find((p) => p.isPrimary)?.url || room.photos[0].url}
                        alt={room.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-slate-100 rounded-lg mb-4 flex items-center justify-center">
                      <div className="text-center text-slate-400">
                        <svg
                          className="w-8 h-8 mx-auto mb-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <p className="text-sm">No photos yet</p>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 text-sm text-slate-500 mb-4">
                    <span>{room.photos.length} photos</span>
                    {room.notes && <span>• Has notes</span>}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/project/${projectId}/rooms/${room._id}`} className="flex-1">
                      <Button className="w-full">
                        {room.photos.length > 0 ? "View Room" : "Add Photos"}
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => deleteRoom({ id: room._id })}
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
