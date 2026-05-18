import {
  ActionIcon,
  Autocomplete,
  Button,
  ButtonProps,
  Card,
  Combobox,
  createTheme,
  CSSVariablesResolver,
  DEFAULT_THEME,
  defaultVariantColorsResolver,
  Drawer,
  Input,
  MantineTheme,
  Menu,
  Modal,
  MultiSelect,
  Notification,
  Paper,
  Popover,
  Select,
  TagsInput,
  Tooltip,
} from "@mantine/core";
import { cssAvaVar } from "../../lib/utils/browser/css";
import {
  AVANDAR_BLUE_SHADES,
  NEUTRAL_SHADES,
  PRIMARY_COLOR_LIGHT_SHADE,
} from "../../../shared/config/Theme";
import {
  ANIMATION_DURATION,
  ANIMATION_EASING,
  ANIMATION_TRANSITION,
  AnimationTheme,
  DEFAULT_COMBOBOX_PROPS,
  MANTINE_TRANSITION_PROPS,
} from "./AnimationTheme";
import {
  ELEVATION_BORDERS,
  ELEVATION_RADIUS,
  ELEVATION_SHADOWS,
  ELEVATION_SURFACES,
} from "./themeElevation";
import type {
  VariantColorResolverResult,
  VariantColorsResolverInput,
} from "@mantine/core";

/**
 * AppShell main z-index.
 * This effectively sets our "base" z-index to be 200. This ensures the app
 * shell shows up above the sidebar on the left.
 *
 * This means any other content that must show up above the main app content
 * should be at a higher z-index than 200.
 */
export const APP_SHELL_MAIN_Z_INDEX = 200;

/**
 * Modal z-index above AppShell main.
 *
 * Mantine's `getDefaultZIndex("modal")` is hardcoded to 201 and ignores
 * `theme.zIndex`, so defaults are set on `Modal` and `ModalsProvider`.
 */
export const MODAL_ROOT_Z_INDEX = 300;

const interactiveTransition = AnimationTheme.transition.interactive;

function avandarVariantColorResolver(
  input: VariantColorsResolverInput,
): VariantColorResolverResult {
  const resolved = defaultVariantColorsResolver(input);
  const { variant, color, theme } = input;
  const paletteColor = color ?? theme.primaryColor;
  const shades = theme.colors[paletteColor] ?? theme.colors.primary;

  if (variant === "outline") {
    return {
      background: "transparent",
      hover: shades[0],
      color: shades[7],
      border: `1px solid ${shades[4]}`,
    };
  }

  if (variant === "subtle") {
    return {
      background: "transparent",
      hover: ELEVATION_SURFACES.light.sunken,
      color: shades[7],
      border: "1px solid transparent",
    };
  }

  if (variant === "light") {
    return {
      background: shades[0],
      hover: shades[1],
      color: shades[7],
      border: `1px solid ${ELEVATION_BORDERS.light.default}`,
    };
  }

  if (variant === "default") {
    return {
      background: ELEVATION_SURFACES.light.raised,
      hover: ELEVATION_SURFACES.light.sunken,
      color: theme.colors.neutral[8],
      border: `1px solid ${ELEVATION_BORDERS.light.default}`,
    };
  }

  return resolved;
}

export const Theme = createTheme({
  scale: 1,
  fontFamily: "Figtree, sans-serif",
  primaryShade: { light: PRIMARY_COLOR_LIGHT_SHADE, dark: 8 },
  primaryColor: "primary",
  defaultRadius: "sm",
  respectReducedMotion: true,

  shadows: ELEVATION_SHADOWS,
  radius: ELEVATION_RADIUS,

  variantColorResolver: avandarVariantColorResolver,

  components: {
    Button: Button.extend({
      defaultProps: {
        radius: "sm",
      },
      styles: (theme: MantineTheme, props: ButtonProps) => {
        return {
          root: {
            transition: interactiveTransition,
            fontWeight: 500,
            ...(props.variant === "default" ?
              {
                borderColor: cssAvaVar("border-default"),
                boxShadow: theme.shadows.xs,
              }
            : {}),
          },
        };
      },
    }),

    ActionIcon: ActionIcon.extend({
      defaultProps: {
        radius: "sm",
      },
      styles: {
        root: {
          transition: interactiveTransition,
        },
      },
    }),

    Paper: Paper.extend({
      defaultProps: {
        radius: "sm",
        shadow: "sm",
        withBorder: true,
      },
      styles: {
        root: {
          borderColor: "var(--ava-border-default)",
          transition: interactiveTransition,
        },
      },
    }),

    Card: Card.extend({
      defaultProps: {
        radius: "sm",
        shadow: "sm",
        withBorder: true,
      },
      styles: {
        root: {
          borderColor: "var(--ava-border-default)",
          transition: interactiveTransition,
        },
      },
    }),

    Modal: Modal.extend({
      defaultProps: {
        zIndex: MODAL_ROOT_Z_INDEX,
        radius: "sm",
        centered: true,
        overlayProps: {
          backgroundOpacity: 0.35,
          blur: 0,
        },
        transitionProps: MANTINE_TRANSITION_PROPS.modal,
      },
      styles: {
        content: {
          border: "1px solid var(--ava-border-default)",
          boxShadow: "var(--mantine-shadow-lg)",
        },
      },
    }),

    Drawer: Drawer.extend({
      defaultProps: {
        transitionProps: MANTINE_TRANSITION_PROPS.drawer,
      },
    }),

    Menu: Menu.extend({
      defaultProps: {
        radius: "sm",
        shadow: "md",
        transitionProps: MANTINE_TRANSITION_PROPS.menu,
      },
      styles: {
        dropdown: {
          border: "1px solid var(--ava-border-default)",
        },
        item: {
          transition: AnimationTheme.transition.colors,
        },
      },
    }),

    Popover: Popover.extend({
      defaultProps: {
        radius: "sm",
        shadow: "md",
        transitionProps: MANTINE_TRANSITION_PROPS.popover,
      },
      styles: {
        dropdown: {
          border: "1px solid var(--ava-border-default)",
        },
      },
    }),

    /**
     * Combobox powers Select, MultiSelect, Autocomplete, TagsInput dropdowns.
     * Mantine defaults to `fade` with `duration: 0` (no animation).
     */
    Combobox: Combobox.extend({
      defaultProps: DEFAULT_COMBOBOX_PROPS,
      styles: {
        dropdown: {
          border: "1px solid var(--ava-border-default)",
        },
        option: {
          transition: AnimationTheme.transition.colors,
        },
      },
    }),

    Select: Select.extend({
      defaultProps: {
        radius: "sm",
        comboboxProps: DEFAULT_COMBOBOX_PROPS,
      },
    }),

    MultiSelect: MultiSelect.extend({
      defaultProps: {
        radius: "sm",
        comboboxProps: DEFAULT_COMBOBOX_PROPS,
      },
    }),

    Autocomplete: Autocomplete.extend({
      defaultProps: {
        radius: "sm",
        comboboxProps: DEFAULT_COMBOBOX_PROPS,
      },
    }),

    TagsInput: TagsInput.extend({
      defaultProps: {
        radius: "sm",
        comboboxProps: DEFAULT_COMBOBOX_PROPS,
      },
    }),

    Input: Input.extend({
      defaultProps: {
        radius: "sm",
      },
      styles: {
        input: {
          transition: interactiveTransition,
          borderColor: "var(--ava-border-default)",
          "&:focus": {
            borderColor: "var(--ava-border-focus)",
          },
        },
      },
    }),

    Tooltip: Tooltip.extend({
      defaultProps: {
        radius: "sm",
        transitionProps: MANTINE_TRANSITION_PROPS.tooltip,
      },
    }),

    Notification: Notification.extend({
      defaultProps: {
        radius: "sm",
      },
      styles: {
        root: {
          border: "1px solid var(--ava-border-default)",
          boxShadow: "var(--mantine-shadow-md)",
        },
      },
    }),
  },

  colors: {
    primary: AVANDAR_BLUE_SHADES,
    secondary: [
      "#fffbea",
      "#fff3c4",
      "#fce588",
      "#fadb5f",
      "#f7c948",
      "#f0b429",
      "#de911d",
      "#cb6e17",
      "#b44d12",
      "#8d2b0b",
    ] as const,
    success: [
      "#eafcef",
      "#d9f6df",
      "#b1ebbe",
      "#86e09a",
      "#63d77c",
      "#4dd269",
      "#40cf5e",
      "#31b74e",
      "#27a343",
      "#168d36",
    ] as const,
    warning: [
      "#fffae2",
      "#fdf4ce",
      "#fae8a0",
      "#f6db6d",
      "#f4d043",
      "#f2c928",
      "#f1c617",
      "#d7ae06",
      "#bf9b00",
      "#a58500",
    ] as const,
    danger: [
      "#ffebe8",
      "#ffd6d2",
      "#f6ada5",
      "#ef8075",
      "#e95a4c",
      "#e64231",
      "#e53523",
      "#cb2717",
      "#b61f13",
      "#a0140c",
    ] as const,
    info: [
      "#e6fcff",
      "#d5f5fa",
      "#abe9f3",
      "#7edcec",
      "#5dd2e6",
      "#49cce2",
      "#3bc9e1",
      "#2bb1c8",
      "#169eb3",
      "#00899d",
    ] as const,
    neutral: NEUTRAL_SHADES,
  },

  breakpoints: {
    xs: "36em",
    sm: "48em",
    md: "62em",
    lg: "75em",
    xl: "88em",
  },

  spacing: {
    xxxs: "calc(0.125rem * var(--mantine-scale))",
    xxs: "calc(0.25rem * var(--mantine-scale))",
    xs: "calc(0.5rem * var(--mantine-scale))",
    sm: "calc(0.75rem * var(--mantine-scale))",
    md: "calc(1rem * var(--mantine-scale))",
    lg: "calc(1.5rem * var(--mantine-scale))",
    xl: "calc(2rem * var(--mantine-scale))",
    xxl: "calc(3rem * var(--mantine-scale))",
    xxxl: "calc(4rem * var(--mantine-scale))",
  },

  other: {
    primaryColor: AVANDAR_BLUE_SHADES[PRIMARY_COLOR_LIGHT_SHADE],
    zIndex: {
      appShellMain: APP_SHELL_MAIN_Z_INDEX,
      modal: MODAL_ROOT_Z_INDEX,
    },
    elevation: {
      surfaces: ELEVATION_SURFACES,
      borders: ELEVATION_BORDERS,
      shadows: ELEVATION_SHADOWS,
    },
    animation: AnimationTheme,
    navbar: {
      backgroundColor: NEUTRAL_SHADES[6],
      textColor: DEFAULT_THEME.white,
      hoverBackgroundColor: NEUTRAL_SHADES[7],
      activeBackgroundColor: NEUTRAL_SHADES[7],
      activeHoverBackgroundColor: NEUTRAL_SHADES[7],
    },
  },
}) as MantineTheme;

export { AnimationTheme } from "./AnimationTheme";

export const cssVariablesResolver: CSSVariablesResolver = (
  theme: MantineTheme,
) => {
  const { elevation } = theme.other;

  const sharedVariables = {
    "--mantine-navbar-background": theme.other.navbar.backgroundColor,
    "--mantine-navbar-color": theme.other.navbar.textColor,
    "--mantine-navbar-hover-background":
      theme.other.navbar.hoverBackgroundColor,
    "--mantine-navbar-active-background":
      theme.other.navbar.activeBackgroundColor,
    "--mantine-navbar-active-hover-background":
      theme.other.navbar.activeHoverBackgroundColor,
    "--navbar-transition-duration": ANIMATION_DURATION.fast,

    "--mantine-z-index-app-shell-main": String(theme.other.zIndex.appShellMain),
    "--mantine-z-index-modal": String(theme.other.zIndex.modal),

    "--ava-animation-duration-instant": ANIMATION_DURATION.instant,
    "--ava-animation-duration-fast": ANIMATION_DURATION.fast,
    "--ava-animation-duration-normal": ANIMATION_DURATION.normal,
    "--ava-animation-duration-moderate": ANIMATION_DURATION.moderate,
    "--ava-animation-duration-slow": ANIMATION_DURATION.slow,
    "--ava-animation-easing-out": ANIMATION_EASING.out,
    "--ava-animation-easing-out-soft": ANIMATION_EASING.outSoft,
    "--ava-animation-easing-in-out": ANIMATION_EASING.inOut,
    "--ava-transition-colors": ANIMATION_TRANSITION.colors,
    "--ava-transition-interactive": ANIMATION_TRANSITION.interactive,
    "--ava-transition-transform": ANIMATION_TRANSITION.transform,
    "--ava-transition-opacity": ANIMATION_TRANSITION.opacity,
    "--ava-transition-shadow": ANIMATION_TRANSITION.shadow,
  };

  return {
    variables: sharedVariables,
    light: {
      "--mantine-primary-color": theme.other.primaryColor,
      "--mantine-color-body": elevation.surfaces.light.body,
      "--mantine-color-text": theme.colors.neutral[9],

      "--ava-border-default": elevation.borders.light.default,
      "--ava-border-strong": elevation.borders.light.strong,
      "--ava-border-focus": elevation.borders.light.focus,
      "--ava-surface-body": elevation.surfaces.light.body,
      "--ava-surface-raised": elevation.surfaces.light.raised,
      "--ava-surface-overlay": elevation.surfaces.light.overlay,
      "--ava-surface-sunken": elevation.surfaces.light.sunken,
    },
    dark: {
      "--mantine-primary-color": theme.other.primaryColor,
      "--mantine-color-body": elevation.surfaces.dark.body,
      "--mantine-color-text": theme.colors.neutral[0],

      "--ava-border-default": elevation.borders.dark.default,
      "--ava-border-strong": elevation.borders.dark.strong,
      "--ava-border-focus": elevation.borders.dark.focus,
      "--ava-surface-body": elevation.surfaces.dark.body,
      "--ava-surface-raised": elevation.surfaces.dark.raised,
      "--ava-surface-overlay": elevation.surfaces.dark.overlay,
      "--ava-surface-sunken": elevation.surfaces.dark.sunken,

      "--mantine-shadow-xs": elevation.shadows.xs,
      "--mantine-shadow-sm": elevation.shadows.sm,
      "--mantine-shadow-md": elevation.shadows.md,
      "--mantine-shadow-lg": elevation.shadows.lg,
      "--mantine-shadow-xl": elevation.shadows.xl,
    },
  };
};

export const ThemeColors = { ...DEFAULT_THEME.colors, ...Theme.colors };
