import type { Id } from "@/convex/_generated/dataModel";

export interface Project {
  _id: Id<"projects">;
  _creationTime: number;
  userId: string;
  name: string;
  description?: string;
  budget?: {
    total: number;
    spent: number;
    currency: string;
  };
  styleProfile?: {
    primaryStyle: string;
    secondaryStyle?: string;
    colorPreferences: string[];
    priorities: string[];
  };
  createdAt: number;
  updatedAt: number;
}

export interface Room {
  _id: Id<"rooms">;
  _creationTime: number;
  projectId: Id<"projects">;
  name: string;
  type: string;
  photos: {
    storageId: Id<"_storage">;
    url: string;
    isPrimary?: boolean;
    uploadedAt: number;
  }[];
  dimensions?: {
    width: number;
    length: number;
    height?: number;
    unit: string;
  };
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Analysis {
  _id: Id<"analyses">;
  _creationTime: number;
  roomId: Id<"rooms">;
  photoStorageId?: Id<"_storage">;
  photoStorageIds?: Id<"_storage">[];
  status: "pending" | "processing" | "completed" | "failed";
  results?: {
    furniture: {
      item: string;
      location: string;
      condition: string;
      style: string;
    }[];
    lighting: {
      natural: string;
      artificial: string[];
      assessment: string;
    };
    colors: {
      dominant: string[];
      accents: string[];
      palette: string;
    };
    layout: {
      flow: string;
      focalPoint?: string;
      issues: string[];
    };
    style: {
      detected: string;
      confidence: number;
      elements: string[];
    };
    rawAnalysis: string;
  };
  error?: string;
  createdAt: number;
  completedAt?: number;
}

export interface RecommendationItem {
  id: string;
  title: string;
  description: string;
  category: string;
  estimatedCost: {
    min: number;
    max: number;
    currency: string;
  };
  impact: "high" | "medium" | "low";
  difficulty: "diy" | "easy_install" | "professional";
  reasoning: string;
  visualizationPrompt?: string;
  suggestedPhotoStorageId?: Id<"_storage">;
  selected?: boolean;
}

export interface Recommendation {
  _id: Id<"recommendations">;
  _creationTime: number;
  roomId: Id<"rooms">;
  analysisId: Id<"analyses">;
  tier: "quick_wins" | "transformations";
  status: "pending" | "generating" | "completed" | "failed";
  items: RecommendationItem[];
  summary?: string;
  error?: string;
  createdAt: number;
}

export interface Visualization {
  _id: Id<"visualizations">;
  _creationTime: number;
  roomId: Id<"rooms">;
  recommendationId?: Id<"recommendations">;
  originalPhotoId: Id<"_storage">;
  status: "queued" | "processing" | "completed" | "failed";
  type: "full_render" | "item_change" | "color_change" | "style_transfer";
  input: {
    prompt: string;
    negativePrompt?: string;
    controlNetMode: string;
    strength: number;
    seed?: number;
  };
  output?: {
    storageId: Id<"_storage">;
    url: string;
    replicateId?: string;
  };
  error?: string;
  createdAt: number;
  completedAt?: number;
}

export interface StyleQuizResponse {
  _id: Id<"styleQuizResponses">;
  _creationTime: number;
  userId: string;
  emotionalVibe?: string;
  visualAnchor?: string;
  decorDensity?: string;
  colorPattern?: string;
  calculatedStyle?: {
    primaryStyle: string;
    secondaryStyle?: string;
    description: string;
    emotionalVibe: string;
    decorDensity: string;
    colorPattern: string;
  };
  createdAt: number;
  completedAt?: number;
}
