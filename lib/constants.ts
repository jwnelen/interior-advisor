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

export const DIFFICULTY_LABELS = {
  diy: "DIY",
  easy_install: "Easy Install",
  professional: "Professional",
} as const;

export const IMPACT_COLORS = {
  high: "bg-status-success text-status-success-text",
  medium: "bg-status-warning text-status-warning-text",
  low: "bg-status-neutral text-status-neutral-text",
} as const;
