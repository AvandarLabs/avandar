import { DefaultMantineColor, MantineColorsTuple } from "@mantine/core";

type CustomAppColors =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

type ExtendedAppColors = CustomAppColors | DefaultMantineColor;

declare module "@mantine/core" {
  export interface MantineThemeOther {
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

  export interface MantineThemeColorsOverride {
    colors: Record<ExtendedAppColors, MantineColorsTuple>;
  }
}
