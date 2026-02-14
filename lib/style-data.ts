export const STYLE_IMAGES = [
  {
    id: "modern",
    label: "Modern",
    color: "bg-surface-inset",
    imageUrl: "https://cdn.home-designing.com/wp-content/uploads/2018/01/Sophisticated-home-decor.jpg",
  },
  {
    id: "scandinavian",
    label: "Scandinavian",
    color: "bg-amber-50 dark:bg-amber-950/30",
    imageUrl: "https://media.designcafe.com/wp-content/uploads/2020/11/18133838/scandinavian-interior-design-ideas.jpg",
  },
  {
    id: "industrial",
    label: "Industrial",
    color: "bg-zinc-200 dark:bg-zinc-800",
    imageUrl: "https://images.surferseo.art/73bc365a-35d6-4919-93e4-076cf008385b.jpeg",
  },
  {
    id: "traditional",
    label: "Traditional",
    color: "bg-rose-50 dark:bg-rose-950/30",
    imageUrl: "https://www.decorilla.com/online-decorating/wp-content/uploads/2018/11/traditional-interior-design-feature.jpg",
  },
  {
    id: "bohemian",
    label: "Bohemian",
    color: "bg-orange-100 dark:bg-orange-950/30",
    imageUrl: "https://landmarksarchitects.com/wp-content/uploads/2024/10/modern-bohemian-interior-natural-texture-1032024.jpg",
  },
  {
    id: "minimalist",
    label: "Minimalist",
    color: "bg-surface-elevated",
    imageUrl: "https://res.cloudinary.com/dw4e01qx8/f_auto,q_auto/images/l3xh0uhrqgaxmjwekbvl",
  },
  {
    id: "coastal",
    label: "Coastal",
    color: "bg-sky-100 dark:bg-sky-950/30",
    imageUrl: "https://media.architecturaldigest.com/photos/6410bb0291526c92b3c540ef/16:9/w_6639,h_3734,c_limit/3%20(1).jpg",
  },
  {
    id: "midcentury",
    label: "Mid-Century",
    color: "bg-amber-100 dark:bg-amber-950/30",
    imageUrl: "https://downloads.ctfassets.net/ylqmmgjpbpfw/4nUSTlETtrahuCPthCLTpi/f560c8d7c121c67e74b69ac61e2efc30/Presidents-Day-Spring-Sale-Soto-Chairs-Royale-Blush-T4-430-HERO.jpg?h=720&w=1366&fit=fill&fl=progressive",
  },
];

export const QUIZ_PAIRS = [
  {
    id: "q1",
    question: "Which space feels more like home?",
    options: [
      { id: "modern", label: "Clean & Contemporary" },
      { id: "traditional", label: "Classic & Timeless" },
    ],
  },
  {
    id: "q2",
    question: "What atmosphere do you prefer?",
    options: [
      { id: "minimalist", label: "Minimal & Calm" },
      { id: "bohemian", label: "Layered & Eclectic" },
    ],
  },
  {
    id: "q3",
    question: "Which materials speak to you?",
    options: [
      { id: "scandinavian", label: "Natural Wood & Linen" },
      { id: "industrial", label: "Metal & Concrete" },
    ],
  },
  {
    id: "q4",
    question: "What vibe resonates with you?",
    options: [
      { id: "coastal", label: "Relaxed & Breezy" },
      { id: "midcentury", label: "Retro & Organic" },
    ],
  },
];

export const PREFERENCES = [
  {
    id: "comfort",
    label: "Comfort",
    leftLabel: "Practical",
    rightLabel: "Luxurious",
    leftImageUrl: "https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?auto=format&fit=crop&q=80&w=400",
    rightImageUrl: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=400",
  },
  {
    id: "aesthetics",
    label: "Style",
    leftLabel: "Subdued",
    rightLabel: "Bold",
    leftImageUrl: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&q=80&w=400",
    rightImageUrl: "https://images.unsplash.com/photo-1557597774-9d2739f85a76?auto=format&fit=crop&q=80&w=400",
  },
  {
    id: "minimal",
    label: "Amount",
    leftLabel: "Minimal",
    rightLabel: "Layered",
    leftImageUrl: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&q=80&w=400",
    rightImageUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=400",
  },
  {
    id: "cozy",
    label: "Feeling",
    leftLabel: "Airy",
    rightLabel: "Cozy",
    leftImageUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=400",
    rightImageUrl: "https://images.unsplash.com/photo-1536376074432-8f258bb71ad0?auto=format&fit=crop&q=80&w=400",
  },
  {
    id: "modern",
    label: "Era",
    leftLabel: "Contemporary",
    rightLabel: "Classic",
    leftImageUrl: "https://images.unsplash.com/photo-1481437156560-3205f6a55735?auto=format&fit=crop&q=80&w=400",
    rightImageUrl: "https://images.unsplash.com/photo-1531835551805-16d864c8d311?auto=format&fit=crop&q=80&w=400",
  },
];

export const STYLE_DESCRIPTIONS: Record<string, string> = {
  modern: "Clean lines, neutral colors, and functional design define your taste",
  scandinavian: "You prefer light, airy spaces with natural materials and cozy textiles",
  industrial: "Raw materials, exposed elements, and urban aesthetics appeal to you",
  traditional: "Classic elegance, rich colors, and timeless furniture suit your style",
  bohemian: "Eclectic patterns, global influences, and artistic expression inspire you",
  minimalist: "You believe less is more, with each item serving a purpose",
  coastal: "Relaxed, breezy vibes with natural textures make you feel at home",
  midcentury: "Retro charm with organic shapes and functional beauty defines your space",
};

export const STYLE_COLOR_PALETTES: Record<string, string[]> = {
  modern: ["charcoal gray", "soft white", "walnut wood"],
  scandinavian: ["warm oak", "soft white", "sage green"],
  industrial: ["graphite", "brushed metal", "weathered wood"],
  traditional: ["rich mahogany", "cream", "navy blue"],
  bohemian: ["terracotta", "mustard yellow", "emerald green"],
  minimalist: ["crisp white", "light gray", "natural wood"],
  coastal: ["seafoam", "light sand", "ocean blue"],
  midcentury: ["teak", "olive green", "burnt orange"],
};

/** Maps color names to CSS-friendly hex values for visual swatches */
export const COLOR_HEX_MAP: Record<string, string> = {
  "charcoal gray": "#36454F",
  "soft white": "#F5F5F0",
  "walnut wood": "#5C4033",
  "warm oak": "#C6A664",
  "sage green": "#B2AC88",
  "graphite": "#41424C",
  "brushed metal": "#A8A9AD",
  "weathered wood": "#8B7D6B",
  "rich mahogany": "#C04000",
  "cream": "#FFFDD0",
  "navy blue": "#000080",
  "terracotta": "#E2725B",
  "mustard yellow": "#FFDB58",
  "emerald green": "#50C878",
  "crisp white": "#FFFFFF",
  "light gray": "#D3D3D3",
  "natural wood": "#DEB887",
  "seafoam": "#93E9BE",
  "light sand": "#C2B280",
  "ocean blue": "#4F97A3",
  "teak": "#B08D57",
  "olive green": "#808000",
  "burnt orange": "#CC5500",
};
