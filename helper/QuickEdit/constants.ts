export const TABS = [
  { id: "retouch" as const, label: "Retouch", icon: "brush" },
  { id: "crop" as const, label: "Crop", icon: "crop" },
  { id: "adjust" as const, label: "Adjust", icon: "options" },
  { id: "filters" as const, label: "Filters", icon: "color-filter" },
];

export const CROP_MODES = [
  { id: "free" as const, label: "Free" },
  { id: "1:1" as const, label: "1:1" },
  { id: "16:9" as const, label: "16:9" },
];

export const ADJUSTMENT_PRESETS = [
  "Blur Background",
  "Enhance Details",
  "Warmer Lighting", 
  "Studio Light",
];

export const FILTER_PRESETS = [
  "Synthwave",
  "Anime", 
  "Lomo",
  "Glitch"
];

export const MAX_IMAGES = 5;