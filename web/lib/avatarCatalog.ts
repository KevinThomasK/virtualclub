export type CatalogOption = {
  id: string;
  label: string;
  emoji: string;
  color: string;
  description?: string;
};

export type AvatarOutfit = {
  gender: string;
  color: string;
  shirt: string;
  pants: string;
  shoes: string;
  style: string;
};

export const GENDER_OPTIONS: CatalogOption[] = [
  {
    id: "male",
    label: "Male",
    emoji: "🕺",
    color: "#38bdf8",
    description: "Broad shoulders, short hair",
  },
  {
    id: "female",
    label: "Female",
    emoji: "💃",
    color: "#f472b6",
    description: "Slim build, long hair",
  },
];

export const ACCENT_COLORS: CatalogOption[] = [
  { id: "indigo", label: "Electric Indigo", emoji: "💜", color: "#6366f1" },
  { id: "pink", label: "Hot Pink", emoji: "💗", color: "#ec4899" },
  { id: "teal", label: "Neon Teal", emoji: "🩵", color: "#14b8a6" },
  { id: "orange", label: "Sunset Orange", emoji: "🧡", color: "#f97316" },
  { id: "gold", label: "Gold Rush", emoji: "💛", color: "#eab308" },
  { id: "green", label: "Laser Green", emoji: "💚", color: "#22c55e" },
  { id: "blue", label: "Sky Blue", emoji: "💙", color: "#3b82f6" },
  { id: "violet", label: "Ultra Violet", emoji: "🔮", color: "#a855f7" },
  { id: "crimson", label: "Crimson", emoji: "❤️", color: "#ef4444" },
  { id: "mint", label: "Mint Ice", emoji: "🌿", color: "#2dd4bf" },
];

export const SHIRT_OPTIONS: CatalogOption[] = [
  {
    id: "neon-jacket",
    label: "Neon Jacket",
    emoji: "🧥",
    color: "#1e1b4b",
    description: "Padded rave jacket",
  },
  {
    id: "crop-top",
    label: "Crop Top",
    emoji: "👚",
    color: "#831843",
    description: "Bold festival top",
  },
  {
    id: "bomber",
    label: "Bomber",
    emoji: "🛩️",
    color: "#334155",
    description: "Classic street bomber",
  },
  {
    id: "mesh-tank",
    label: "Mesh Tank",
    emoji: "🎽",
    color: "#0f766e",
    description: "Breathable mesh layer",
  },
  {
    id: "glitter-dress",
    label: "Glitter Dress",
    emoji: "👗",
    color: "#701a75",
    description: "Shimmering one-piece",
  },
  {
    id: "hoodie",
    label: "Oversized Hoodie",
    emoji: "🧢",
    color: "#111827",
    description: "Cozy oversized fit",
  },
];

export const PANTS_OPTIONS: CatalogOption[] = [
  {
    id: "cargo",
    label: "Cargo Pants",
    emoji: "👖",
    color: "#3f3f46",
    description: "Utility pockets",
  },
  {
    id: "skinny",
    label: "Skinny Fit",
    emoji: "🪡",
    color: "#18181b",
    description: "Slim silhouette",
  },
  {
    id: "wide-leg",
    label: "Wide Leg",
    emoji: "🌊",
    color: "#27272a",
    description: "Flowy wide cut",
  },
  {
    id: "shorts",
    label: "Rave Shorts",
    emoji: "🩳",
    color: "#4c1d95",
    description: "Summer stage look",
  },
  {
    id: "leather",
    label: "Leather Pants",
    emoji: "🖤",
    color: "#0a0a0a",
    description: "Glossy leather",
  },
  {
    id: "joggers",
    label: "Joggers",
    emoji: "🏃",
    color: "#1f2937",
    description: "Comfort flex fit",
  },
];

export const SHOES_OPTIONS: CatalogOption[] = [
  {
    id: "high-tops",
    label: "High Tops",
    emoji: "👟",
    color: "#f8fafc",
    description: "Classic high tops",
  },
  {
    id: "boots",
    label: "Combat Boots",
    emoji: "🥾",
    color: "#292524",
    description: "Heavy stage boots",
  },
  {
    id: "sneakers",
    label: "Sneakers",
    emoji: "👞",
    color: "#e2e8f0",
    description: "Lightweight kicks",
  },
  {
    id: "platforms",
    label: "Platforms",
    emoji: "👠",
    color: "#fde68a",
    description: "Extra height glow",
  },
  {
    id: "glow-runners",
    label: "Glow Runners",
    emoji: "✨",
    color: "#67e8f9",
    description: "LED sole runners",
  },
  {
    id: "sliders",
    label: "Slides",
    emoji: "🩴",
    color: "#94a3b8",
    description: "Chill VIP slides",
  },
];

export const STYLE_OPTIONS: CatalogOption[] = [
  {
    id: "cyber",
    label: "Cyber",
    emoji: "🤖",
    color: "#818cf8",
    description: "Visor + halo tech look",
  },
  {
    id: "street",
    label: "Street",
    emoji: "🛹",
    color: "#f97316",
    description: "Minimal urban vibe",
  },
  {
    id: "rave",
    label: "Rave",
    emoji: "🎉",
    color: "#f472b6",
    description: "Maximum glow energy",
  },
  {
    id: "elegant",
    label: "Elegant",
    emoji: "💎",
    color: "#c4b5fd",
    description: "Soft premium finish",
  },
];

export const DEFAULT_OUTFIT: AvatarOutfit = {
  gender: GENDER_OPTIONS[0].id,
  color: ACCENT_COLORS[0].color,
  shirt: SHIRT_OPTIONS[0].id,
  pants: PANTS_OPTIONS[0].id,
  shoes: SHOES_OPTIONS[0].id,
  style: STYLE_OPTIONS[0].id,
};

const ALL_OPTIONS = {
  gender: GENDER_OPTIONS,
  shirt: SHIRT_OPTIONS,
  pants: PANTS_OPTIONS,
  shoes: SHOES_OPTIONS,
  style: STYLE_OPTIONS,
};

export function findOption(
  list: CatalogOption[],
  id: string | undefined,
): CatalogOption | undefined {
  return list.find((option) => option.id === id);
}

export function findAccentColor(hex: string | undefined): CatalogOption {
  return (
    ACCENT_COLORS.find((option) => option.color === hex) ?? ACCENT_COLORS[0]
  );
}

export function resolveOutfit(input: Partial<AvatarOutfit> = {}): AvatarOutfit {
  const accent = findAccentColor(input.color);

  return {
    gender:
      findOption(GENDER_OPTIONS, input.gender)?.id ?? DEFAULT_OUTFIT.gender,
    color: accent.color,
    shirt: findOption(SHIRT_OPTIONS, input.shirt)?.id ?? DEFAULT_OUTFIT.shirt,
    pants: findOption(PANTS_OPTIONS, input.pants)?.id ?? DEFAULT_OUTFIT.pants,
    shoes: findOption(SHOES_OPTIONS, input.shoes)?.id ?? DEFAULT_OUTFIT.shoes,
    style: findOption(STYLE_OPTIONS, input.style)?.id ?? DEFAULT_OUTFIT.style,
  };
}

export function getOutfitColors(outfit: AvatarOutfit) {
  return {
    accent: outfit.color,
    shirt: findOption(SHIRT_OPTIONS, outfit.shirt)?.color ?? "#1e1b4b",
    pants: findOption(PANTS_OPTIONS, outfit.pants)?.color ?? "#3f3f46",
    shoes: findOption(SHOES_OPTIONS, outfit.shoes)?.color ?? "#f8fafc",
    style: findOption(STYLE_OPTIONS, outfit.style)?.color ?? "#818cf8",
  };
}

export function isValidOutfitId(
  key: keyof typeof ALL_OPTIONS,
  id: string | undefined,
): boolean {
  if (!id) return false;
  return ALL_OPTIONS[key].some((option) => option.id === id);
}

export function isValidAccentColor(color: string | undefined): boolean {
  if (!color) return false;
  return ACCENT_COLORS.some((option) => option.color === color);
}
