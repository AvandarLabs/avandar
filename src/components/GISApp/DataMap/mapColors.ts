/**
 * Map color palette using Avandar Theme colors
 * References colors from the Theme configuration for consistency
 */
import { ThemeColors } from "@/config/Theme";

// Semantic color tokens - map-specific usage with Theme colors
export const mapSemanticColors = {
  // Water - vibrant blues using primary colors
  water: ThemeColors.blue[7],
  waterway: ThemeColors.blue[2],
  ocean: ThemeColors.blue[8],

  // Land - neutral colors for backgrounds
  background: ThemeColors.neutral[1],
  landcover: ThemeColors.neutral[3],
  landuse: ThemeColors.neutral[1],

  // Roads
  roadMotorway: ThemeColors.neutral[3],
  roadTrunk: ThemeColors.neutral[3],
  roadPrimary: ThemeColors.neutral[3],
  roadSecondary: ThemeColors.neutral[2],
  roadTertiary: ThemeColors.neutral[3],
  roadResidential: ThemeColors.neutral[3],
  roadService: ThemeColors.neutral[3],
  roadPath: ThemeColors.neutral[2],

  // Natural features - vibrant greens using success colors
  park: ThemeColors.teal[8],
  grass: ThemeColors.teal[8],
  forest: ThemeColors.teal[9],
  wood: ThemeColors.teal[9],

  // Urban features - modern grays using neutral colors
  building: ThemeColors.neutral[1],
  buildingOutline: ThemeColors.neutral[3],
  buildingExtrusion: ThemeColors.neutral[3],

  // Administrative - subtle but visible using neutral colors
  adminBoundary: ThemeColors.neutral[5],
  adminFill: ThemeColors.neutral[2],
};
