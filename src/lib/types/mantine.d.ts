import type { AnimationTheme } from "@/config/Theme/AnimationTheme";
import type {
  ELEVATION_BORDERS,
  ELEVATION_SHADOWS,
  ELEVATION_SURFACES,
} from "@/config/Theme/themeElevation";
import type {
  DefaultMantineColor,
  DefaultMantineSize,
  MantineColorsTuple,
} from "@mantine/core";

type CustomAppColors =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

type ExtendedAppColors = CustomAppColors | DefaultMantineColor;

type ExtendedCustomSpacing =
  | "xxxs"
  | "xxs"
  | DefaultMantineSize
  | "xxl"
  | "xxxl";

type ElevationSurfaces = typeof ELEVATION_SURFACES;
type ElevationBorders = typeof ELEVATION_BORDERS;
type ElevationShadows = typeof ELEVATION_SHADOWS;

declare module "@mantine/core" {
  export interface MantineThemeOther {
    /** Primary color */
    primaryColor: string;

    zIndex: {
      appShellMain: number;
      modal: number;
    };

    elevation: {
      surfaces: ElevationSurfaces;
      borders: ElevationBorders;
      shadows: ElevationShadows;
    };

    animation: typeof AnimationTheme;

    navbar: {
      /** Navbar background color */
      backgroundColor: string;

      /** Navbar text color */
      textColor: string;

      /** Navbar link background color on hover */
      hoverBackgroundColor: string;

      /** Active navbar link background color*/
      activeBackgroundColor: string;

      /** Active navbar link background color on hover */
      activeHoverBackgroundColor: string;
    };
  }

  export interface MantineThemeSizesOverride {
    spacing: Record<ExtendedCustomSpacing, string>;
  }

  export interface MantineThemeColorsOverride {
    colors: Record<ExtendedAppColors, MantineColorsTuple>;
  }
}

export {};
