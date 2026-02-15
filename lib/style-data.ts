// ============================================================================
// STYLE DISCOVERY QUIZ DATA
// ============================================================================

/**
 * Question 1: Emotional Vibe
 * Helps the LLM understand the primary goal of the design
 */
export const EMOTIONAL_VIBE_QUESTION = {
  id: "emotional-vibe",
  question: "When you walk into this room, what is the single most important feeling you want it to evoke?",
  options: [
    {
      id: "serenity",
      label: "Serenity & Peace",
      description: "Soft, airy, and calming environments",
      imageUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=800",
    },
    {
      id: "energy",
      label: "Energy & Inspiration",
      description: "Bold colors and creative stimulation",
      imageUrl: "https://images.unsplash.com/photo-1557597774-9d2739f85a76?auto=format&fit=crop&q=80&w=800",
    },
    {
      id: "cozy",
      label: "Cozy & Secure",
      description: "Warmth, comfort, and a lived-in feel",
      imageUrl: "https://images.unsplash.com/photo-1536376074432-8f258bb71ad0?auto=format&fit=crop&q=80&w=800",
    },
    {
      id: "order",
      label: "Order & Focus",
      description: "Organization, clean lines, and no clutter",
      imageUrl: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&q=80&w=800",
    },
  ],
};

/**
 * Question 2: Visual Anchor (Object Selection)
 * Users pick a favorite object to categorize into parent styles
 */
export const VISUAL_ANCHOR_QUESTION = {
  id: "visual-anchor",
  question: "Which of these seating styles would you choose for your main lounge area?",
  options: [
    {
      id: "modern",
      label: "Modern/Minimalist",
      description: "Clean, crisp lines with metal or plastic elements",
      imageUrl: "https://cdn.home-designing.com/wp-content/uploads/2018/01/Sophisticated-home-decor.jpg",
    },
    {
      id: "traditional",
      label: "Traditional/Classic",
      description: "Timeless, curved arms, and tufted fabrics",
      imageUrl: "https://www.decorilla.com/online-decorating/wp-content/uploads/2018/11/traditional-interior-design-feature.jpg",
    },
    {
      id: "bohemian",
      label: "Bohemian/Eclectic",
      description: "Layered textures, patterns, and natural materials",
      imageUrl: "https://landmarksarchitects.com/wp-content/uploads/2024/10/modern-bohemian-interior-natural-texture-1032024.jpg",
    },
    {
      id: "industrial",
      label: "Industrial",
      description: "Raw materials like weathered wood and metal pipes",
      imageUrl: "https://images.surferseo.art/73bc365a-35d6-4919-93e4-076cf008385b.jpeg",
    },
  ],
};

/**
 * Question 3: Decor Density (Complexity)
 * Dictates the "noise" level and how much furniture/decor to show
 */
export const DECOR_DENSITY_QUESTION = {
  id: "decor-density",
  question: "How do you feel about 'things'—collections, mementos, and surface decor?",
  options: [
    {
      id: "purist",
      label: "The Purist",
      description: "I want clear surfaces and zero unnecessary items",
      imageUrl: "https://res.cloudinary.com/dw4e01qx8/f_auto,q_auto/images/l3xh0uhrqgaxmjwekbvl",
    },
    {
      id: "curator",
      label: "The Curator",
      description: "I like a balanced amount of meaningful, styled pieces",
      imageUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=800",
    },
    {
      id: "collector",
      label: "The Collector",
      description: "Having many mementos around me makes me feel good",
      imageUrl: "https://landmarksarchitects.com/wp-content/uploads/2024/10/modern-bohemian-interior-natural-texture-1032024.jpg",
    },
  ],
};

/**
 * Question 4: Color & Pattern Threshold
 * Provides strict constraints for color palette and texture selection
 */
export const COLOR_PATTERN_QUESTION = {
  id: "color-pattern",
  question: "What is your comfort level with patterns and bold textures?",
  options: [
    {
      id: "neutral",
      label: "Neutral & Solid",
      description: "Only solid colors and very subtle textures (e.g., linen)",
      imageUrl: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&q=80&w=800",
    },
    {
      id: "natural",
      label: "Natural & Organic",
      description: "Textures found in nature like wood grain or stone",
      imageUrl: "https://media.designcafe.com/wp-content/uploads/2020/11/18133838/scandinavian-interior-design-ideas.jpg",
    },
    {
      id: "bold",
      label: "Bold & Patterned",
      description: "I love geometric prints, stripes, or florals",
      imageUrl: "https://images.unsplash.com/photo-1557597774-9d2739f85a76?auto=format&fit=crop&q=80&w=800",
    },
  ],
};

// ============================================================================
// STYLE MAPPINGS & CALCULATIONS
// ============================================================================

/**
 * Maps user responses to parent interior design styles
 */
export const STYLE_MAPPING = {
  // Visual Anchor directly maps to parent styles
  modern: "modern",
  traditional: "traditional",
  bohemian: "bohemian",
  industrial: "industrial",

  // Refinements based on other answers
  serenity: ["scandinavian", "minimalist", "coastal"],
  energy: ["eclectic", "maximalist", "modern"],
  cozy: ["traditional", "farmhouse", "bohemian"],
  order: ["minimalist", "modern", "scandinavian"],

  purist: ["minimalist", "scandinavian"],
  curator: ["modern", "mid-century"],
  collector: ["bohemian", "eclectic", "maximalist"],

  neutral: ["minimalist", "scandinavian", "modern"],
  natural: ["scandinavian", "coastal", "farmhouse"],
  bold: ["eclectic", "maximalist", "bohemian"],
};

export const STYLE_DESCRIPTIONS: Record<string, string> = {
  modern: "Clean lines, neutral colors, and functional design define your taste. You appreciate simplicity with purpose.",
  scandinavian: "Light, airy spaces with natural materials and cozy textiles. You value hygge and functional beauty.",
  industrial: "Raw materials, exposed elements, and urban aesthetics. You're drawn to authenticity and character.",
  traditional: "Classic elegance, rich colors, and timeless furniture. You appreciate heritage and craftsmanship.",
  bohemian: "Eclectic patterns, global influences, and artistic expression. You celebrate individuality and creativity.",
  minimalist: "You believe less is more, with each item serving a clear purpose. Clarity and calm are essential.",
  coastal: "Relaxed, breezy vibes with natural textures. You're drawn to the serenity of beach-inspired living.",
  "mid-century": "Retro charm with organic shapes and functional beauty. You love the timeless appeal of mid-20th century design.",
  eclectic: "You mix and match styles fearlessly, creating unique spaces that tell your story.",
  maximalist: "More is more! You embrace bold colors, patterns, and abundant decor with confidence.",
  farmhouse: "Rustic charm with modern comfort. You love the warmth of lived-in, homey spaces.",
};

export const STYLE_COLOR_PALETTES: Record<string, string[]> = {
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
  "jewel tones": "#9B59B6",
  "mixed metals": "#A8A9AD",
  "vibrant accents": "#E74C3C",
  "rich burgundy": "#800020",
  "emerald": "#50C878",
  "gold accents": "#FFD700",
  "weathered white": "#F5F5DC",
  "barn wood": "#8B7355",
  "sage": "#9DC183",
};

