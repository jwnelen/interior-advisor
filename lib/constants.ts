export const ROOM_TYPES = [
  { value: "living_room", label: "Living Room" },
  { value: "bedroom", label: "Bedroom" },
  { value: "kitchen", label: "Kitchen" },
  { value: "bathroom", label: "Bathroom" },
  { value: "dining_room", label: "Dining Room" },
  { value: "office", label: "Home Office" },
  { value: "entryway", label: "Entryway" },
  { value: "nursery", label: "Nursery" },
  { value: "guest_room", label: "Guest Room" },
  { value: "other", label: "Other" },
] as const;

export const STYLE_CATEGORIES = [
  { value: "modern", label: "Modern", description: "Clean lines, minimalist aesthetics" },
  { value: "scandinavian", label: "Scandinavian", description: "Light, airy, natural materials" },
  { value: "industrial", label: "Industrial", description: "Raw materials, exposed elements" },
  { value: "traditional", label: "Traditional", description: "Classic, elegant, timeless" },
  { value: "bohemian", label: "Bohemian", description: "Eclectic, artistic, colorful" },
  { value: "minimalist", label: "Minimalist", description: "Less is more, functional" },
  { value: "coastal", label: "Coastal", description: "Relaxed, breezy, natural" },
  { value: "midcentury", label: "Mid-Century Modern", description: "Retro charm, organic shapes" },
  { value: "transitional", label: "Transitional", description: "Blend of traditional and modern" },
  { value: "eclectic", label: "Eclectic", description: "Mix of styles and eras" },
] as const;

export const QUIZ_QUESTIONS = [
  {
    id: "q1",
    question: "Which living room appeals to you more?",
    options: [
      { id: "modern", imageUrl: "/styles/modern-living.jpg", label: "Modern" },
      { id: "traditional", imageUrl: "/styles/traditional-living.jpg", label: "Traditional" },
    ],
  },
  {
    id: "q2",
    question: "What color palette do you prefer?",
    options: [
      { id: "neutral", imageUrl: "/styles/neutral-palette.jpg", label: "Neutral & Calm" },
      { id: "bold", imageUrl: "/styles/bold-palette.jpg", label: "Bold & Vibrant" },
    ],
  },
  {
    id: "q3",
    question: "Which bedroom style feels more like home?",
    options: [
      { id: "minimalist", imageUrl: "/styles/minimalist-bedroom.jpg", label: "Minimalist" },
      { id: "cozy", imageUrl: "/styles/cozy-bedroom.jpg", label: "Cozy & Layered" },
    ],
  },
  {
    id: "q4",
    question: "What materials do you prefer?",
    options: [
      { id: "natural", imageUrl: "/styles/natural-materials.jpg", label: "Natural (wood, linen)" },
      { id: "industrial", imageUrl: "/styles/industrial-materials.jpg", label: "Industrial (metal, concrete)" },
    ],
  },
  {
    id: "q5",
    question: "Which kitchen style do you prefer?",
    options: [
      { id: "scandinavian", imageUrl: "/styles/scandi-kitchen.jpg", label: "Scandinavian" },
      { id: "bohemian", imageUrl: "/styles/boho-kitchen.jpg", label: "Bohemian" },
    ],
  },
] as const;

export const MOOD_BOARD_IMAGES = [
  { id: "mb1", url: "/moods/cozy-corner.jpg", style: "cozy", tags: ["warm", "textiles", "layered"] },
  { id: "mb2", url: "/moods/minimal-space.jpg", style: "minimalist", tags: ["clean", "simple", "white"] },
  { id: "mb3", url: "/moods/boho-vibes.jpg", style: "bohemian", tags: ["patterns", "plants", "eclectic"] },
  { id: "mb4", url: "/moods/modern-loft.jpg", style: "modern", tags: ["sleek", "geometric", "neutral"] },
  { id: "mb5", url: "/moods/coastal-room.jpg", style: "coastal", tags: ["blue", "natural", "airy"] },
  { id: "mb6", url: "/moods/industrial-space.jpg", style: "industrial", tags: ["raw", "metal", "exposed"] },
  { id: "mb7", url: "/moods/midcentury-living.jpg", style: "midcentury", tags: ["retro", "organic", "wood"] },
  { id: "mb8", url: "/moods/traditional-elegance.jpg", style: "traditional", tags: ["classic", "rich", "ornate"] },
] as const;

export const DIFFICULTY_LABELS = {
  diy: "DIY",
  easy_install: "Easy Install",
  professional: "Professional",
} as const;

export const IMPACT_LABELS = {
  high: "High Impact",
  medium: "Medium Impact",
  low: "Low Impact",
} as const;

export const IMPACT_COLORS = {
  high: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-gray-100 text-gray-800",
} as const;
