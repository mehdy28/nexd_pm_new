// lib/avatar-colors.ts

/**
 * Tailwind CSS 500-weight palette hex codes.
 * Selected to match the "bg-*-500" utility classes used in the UI.
 */
export const AVATAR_COLORS = [
    "#ef4444", // Red 500
    "#f97316", // Orange 500
    "#f59e0b", // Amber 500
    "#22c55e", // Green 500
    "#10b981", // Emerald 500
    "#14b8a6", // Teal 500
    "#06b6d4", // Cyan 500
    "#3b82f6", // Blue 500
    "#6366f1", // Indigo 500
    "#8b5cf6", // Violet 500
    "#a855f7", // Purple 500
    "#d946ef", // Fuchsia 500
    "#ec4899", // Pink 500
    "#f43f5e", // Rose 500
  ];
  
  /**
   * Returns a random color from the AVATAR_COLORS palette.
   * Use this in your User Resolver during account creation.
   */
  export const getRandomAvatarColor = (): string => {
    const randomIndex = Math.floor(Math.random() * AVATAR_COLORS.length);
    return AVATAR_COLORS[randomIndex];
  };