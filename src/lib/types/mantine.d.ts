import type { AnimationTheme } from "@/config/Theme/AnimationTheme";
import type { BorderTheme } from "@/config/Theme/BorderTheme";
import type { ElevationTheme } from "@/config/Theme/ElevationTheme";
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

declare module "@mantine/core" {
  export interface MantineThemeOther {
    /** Primary color */
    primaryColor: string;

    zIndex: {
      appShellMain: number;
      appChrome: number;
      modal: number;
    };

    elevation: typeof ElevationTheme;

    borders: typeof BorderTheme;

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
