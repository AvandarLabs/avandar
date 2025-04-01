import {
  createTheme,
  CSSVariablesResolver,
  DEFAULT_THEME,
  MantineTheme,
} from "@mantine/core";

export const Theme = createTheme({
  scale: 1, // root font size is 1rem = 16px
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

  spacing: {
    xxxs: "calc(0.125rem * var(--mantine-scale))", // 2px
    xxs: "calc(0.25rem * var(--mantine-scale))", // 4px
    xs: "calc(0.5rem * var(--mantine-scale))", // 8px
    sm: "calc(0.75rem * var(--mantine-scale))", // 12px
    md: "calc(1rem * var(--mantine-scale))", // 16px
    lg: "calc(1.25rem * var(--mantine-scale))", // 20px
    xl: "calc(1.625rem * var(--mantine-scale))", // 26px
    xxl: "calc(2rem * var(--mantine-scale))", // 32px
    xxxl: "calc(3rem * var(--mantine-scale))", // 48px
  },

  other: {
    navbar: {
      backgroundColor: DEFAULT_THEME.colors.dark[8],
      textColor: DEFAULT_THEME.white,
      hoverBackgroundColor: DEFAULT_THEME.colors.dark[6],
      activeBackgroundColor: DEFAULT_THEME.colors.dark[5],
      activeHoverBackgroundColor: DEFAULT_THEME.colors.dark[4],
    },
  },
});

export const cssVariablesResolver: CSSVariablesResolver = (
  theme: MantineTheme,
) => {
  return {
    variables: {
      "--mantine-navbar-background": theme.other.navbar.backgroundColor,
      "--mantine-navbar-color": theme.other.navbar.textColor,
      "--mantine-navbar-hover-background":
        theme.other.navbar.hoverBackgroundColor,
      "--mantine-navbar-active-background":
        theme.other.navbar.activeBackgroundColor,
      "--mantine-navbar-active-hover-background":
        theme.other.navbar.activeHoverBackgroundColor,
    },
    dark: {},
    light: {},
  };
};
