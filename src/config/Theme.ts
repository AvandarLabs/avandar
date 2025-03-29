import { createTheme } from "@mantine/core";

export const Theme = createTheme({
  other: {},
  primaryShade: { light: 6, dark: 8 },

  /**
   * This is the color that Mantine will use as the default for UI elements
   * like buttons, links, or headlines.
   */
  primaryColor: "blue",
  colors: {},
  breakpoints: {
    xs: "36em", // 576px - small phones (e.g. iPhone SE)
    sm: "48em", // 768px - tablets/large phones
    md: "62em", // 992px - small laptops/tablets landscape
    lg: "75em", // 1200px - standard laptops/desktops
    xl: "88em", // 1408px - large desktops/4K displays
  },
});
