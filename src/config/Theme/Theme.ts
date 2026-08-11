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
// Imported by direct path (not the `@ui` alias) because tailwind.config.js
// loads this module through jiti, which does not resolve the Vite-only `@ui`
// alias. Using `@ui` here breaks tailwind's CSS build.
import { cssAvaVar } from "../../../packages/web/ui/src/cssVar/cssVar";
import {
  AVANDAR_BLUE_SHADES,
  NEUTRAL_SHADES,
  PRIMARY_COLOR_LIGHT_SHADE,
} from "../../../shared/config/Theme";
import { AnimationTheme } from "./AnimationTheme/AnimationTheme";
import { BorderTheme } from "./BorderTheme";
import { ElevationTheme } from "./ElevationTheme";
import { OverlayTheme } from "./OverlayTheme";
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
 * App chrome z-index. Floating toolbars and the mobile navbar live here:
 * above the main content area but always below modals, drawers, and any
 * overlay layer. Anchoring chrome to this token (instead of ad-hoc magic
 * numbers like `1000`) is what keeps things like the Send Feedback button
 * from punching through modal overlays.
 */
export const APP_CHROME_Z_INDEX = 250;

/**
 * Modal z-index above all app chrome.
 *
 * Mantine's `getDefaultZIndex("modal")` is hardcoded to 201 and ignores
 * `theme.zIndex`, so defaults are set on `Modal` and `ModalsProvider`. The
 * value is intentionally well above `APP_CHROME_Z_INDEX` so future floating
 * UI added in the chrome tier cannot accidentally land above modals.
 */
export const MODAL_ROOT_Z_INDEX = 400;

/** Default props for `<Modal>` and `@mantine/modals` ModalsProvider. */
export const DEFAULT_MODAL_PROPS = {
  zIndex: MODAL_ROOT_Z_INDEX,
  centered: true,
  radius: OverlayTheme.panel.radius,
  overlayProps: {
    backgroundOpacity: 0,
    color: "transparent",
    transitionProps: AnimationTheme.mantine.modalOverlay,
    style: {
      background: "var(--ava-overlay-background)",
      backdropFilter: "var(--ava-overlay-backdrop-filter)",
    },
  },
  transitionProps: AnimationTheme.mantine.modal,
} as const;

/**
 * Floating panel z-index. Sits above the app shell (200) but below
 * Mantine's default popover/combobox z-index (300) so that dropdowns
 * opened inside a floating panel render on top of it.
 */

/**
 * Overlay dropdown z-index for popovers, comboboxes, menus, and tooltips.
 * Sits above `MODAL_ROOT_Z_INDEX` so dropdowns opened inside a modal
 * (Share dialog selects, action menus, etc.) render on top of the modal
 * instead of being hidden behind it. Mantine's defaults (300) live below
 * our overridden modal layer (400), so we bump everything in this tier
 * up in one place.
 */
export const POPOVER_Z_INDEX = 500;

/**
 * Toast / notification z-index. Above modals, popovers, and full-screen
 * drop overlays so parse errors stay visible. The notifications container
 * uses `pointer-events: none` so only toasts capture clicks.
 */
export const NOTIFICATIONS_Z_INDEX = 10_000;

const interactiveTransition = AnimationTheme.transition.interactive;

const COMBOBOX_DEFAULT_PROPS = {
  ...AnimationTheme.combobox,
  zIndex: POPOVER_Z_INDEX,
} as const;

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
      hover: ElevationTheme.surfaces.light.sunken,
      color: shades[7],
      border: "1px solid transparent",
    };
  }

  if (variant === "light") {
    return {
      background: shades[0],
      hover: shades[1],
      color: shades[7],
      border: `1px solid ${BorderTheme.colors.light.default}`,
    };
  }

  if (variant === "default") {
    return {
      background: ElevationTheme.surfaces.light.raised,
      hover: ElevationTheme.surfaces.light.sunken,
      color: theme.colors.neutral[8],
      border: `1px solid ${BorderTheme.colors.light.default}`,
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
  shadows: ElevationTheme.shadows,
  radius: BorderTheme.radius,

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
      defaultProps: DEFAULT_MODAL_PROPS,
      styles: {
        overlay: {
          background: "var(--ava-overlay-background)",
          backdropFilter: "var(--ava-overlay-backdrop-filter)",
        },
        content: {
          backgroundColor: "var(--mantine-color-body)",
          border: "none",
          boxShadow: "var(--ava-overlay-panel-shadow)",
        },
        header: {
          borderBottom: "1px solid var(--ava-border-default)",
          minHeight: "unset",
          padding: "var(--mantine-spacing-sm) var(--mantine-spacing-md)",
        },
        body: {
          // Mantine zeroes body padding-top when a header is present; restore
          // gap below the divider.
          paddingTop: "var(--mantine-spacing-md)",
        },
        title: {
          fontWeight: 600,
        },
      },
    }),

    Drawer: Drawer.extend({
      defaultProps: {
        transitionProps: AnimationTheme.mantine.drawer,
      },
    }),

    Menu: Menu.extend({
      defaultProps: {
        radius: "sm",
        shadow: "md",
        zIndex: POPOVER_Z_INDEX,
        transitionProps: AnimationTheme.mantine.menu,
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
        zIndex: POPOVER_Z_INDEX,
        transitionProps: AnimationTheme.mantine.popover,
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
      defaultProps: COMBOBOX_DEFAULT_PROPS,
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
        comboboxProps: COMBOBOX_DEFAULT_PROPS,
      },
    }),

    MultiSelect: MultiSelect.extend({
      defaultProps: {
        radius: "sm",
        comboboxProps: COMBOBOX_DEFAULT_PROPS,
      },
    }),

    Autocomplete: Autocomplete.extend({
      defaultProps: {
        radius: "sm",
        comboboxProps: COMBOBOX_DEFAULT_PROPS,
      },
    }),

    TagsInput: TagsInput.extend({
      defaultProps: {
        radius: "sm",
        comboboxProps: COMBOBOX_DEFAULT_PROPS,
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
        zIndex: POPOVER_Z_INDEX,
        transitionProps: AnimationTheme.mantine.tooltip,
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
      appChrome: APP_CHROME_Z_INDEX,
      modal: MODAL_ROOT_Z_INDEX,
      popover: POPOVER_Z_INDEX,
      notifications: NOTIFICATIONS_Z_INDEX,
    },
    elevation: ElevationTheme,
    borders: BorderTheme,
    animation: AnimationTheme,
    overlay: OverlayTheme,
    navbar: {
      backgroundColor: NEUTRAL_SHADES[6],
      textColor: DEFAULT_THEME.white,
      hoverBackgroundColor: NEUTRAL_SHADES[7],
      activeBackgroundColor: NEUTRAL_SHADES[7],
      activeHoverBackgroundColor: NEUTRAL_SHADES[7],
    },
  },
}) as MantineTheme;

export { AnimationTheme } from "./AnimationTheme/AnimationTheme";
export { BorderTheme } from "./BorderTheme";
export { ElevationTheme } from "./ElevationTheme";
export { OverlayTheme } from "./OverlayTheme";

export const cssVariablesResolver: CSSVariablesResolver = (
  theme: MantineTheme,
) => {
  const { elevation, borders: borderTheme } = theme.other;

  const sharedVariables = {
    "--mantine-navbar-background": theme.other.navbar.backgroundColor,
    "--mantine-navbar-color": theme.other.navbar.textColor,
    "--mantine-navbar-hover-background":
      theme.other.navbar.hoverBackgroundColor,
    "--mantine-navbar-active-background":
      theme.other.navbar.activeBackgroundColor,
    "--mantine-navbar-active-hover-background":
      theme.other.navbar.activeHoverBackgroundColor,
    "--navbar-transition-duration": AnimationTheme.duration.fast,

    "--mantine-z-index-app-shell-main": String(theme.other.zIndex.appShellMain),
    "--mantine-z-index-app-chrome": String(theme.other.zIndex.appChrome),
    "--mantine-z-index-modal": String(theme.other.zIndex.modal),
    "--mantine-z-index-popover": String(theme.other.zIndex.popover),
    "--mantine-z-index-notifications": String(theme.other.zIndex.notifications),

    "--ava-animation-duration-instant": AnimationTheme.duration.instant,
    "--ava-animation-duration-fast": AnimationTheme.duration.fast,
    "--ava-animation-duration-normal": AnimationTheme.duration.normal,
    "--ava-animation-duration-moderate": AnimationTheme.duration.moderate,
    "--ava-animation-duration-slow": AnimationTheme.duration.slow,
    "--ava-animation-easing-out": AnimationTheme.easing.out,
    "--ava-animation-easing-out-soft": AnimationTheme.easing.outSoft,
    "--ava-animation-easing-in-out": AnimationTheme.easing.inOut,
    "--ava-transition-colors": AnimationTheme.transition.colors,
    "--ava-transition-interactive": AnimationTheme.transition.interactive,
    "--ava-transition-transform": AnimationTheme.transition.transform,
    "--ava-transition-opacity": AnimationTheme.transition.opacity,
    "--ava-transition-shadow": AnimationTheme.transition.shadow,

    "--ava-animation-duration-ooze-in": `${AnimationTheme.preset.oozeIn.durationMs}ms`,
    "--ava-animation-duration-swipe-out": `${AnimationTheme.preset.swipeOut.durationMs}ms`,
    "--ava-animation-duration-reduced": `${AnimationTheme.preset.reducedMotionDurationMs}ms`,
    "--ava-animation-easing-spring": AnimationTheme.preset.oozeIn.easing,
    "--ava-animation-easing-swipe-out": AnimationTheme.preset.swipeOut.easing,
    "--ava-animate-swipe-translate-y": `${AnimationTheme.preset.swipeOut.translateYPx}px`,

    "--ava-overlay-background": OverlayTheme.backdrop.backgroundColor,
    "--ava-overlay-backdrop-filter": OverlayTheme.backdrop.backdropFilter,
    "--ava-overlay-panel-shadow": OverlayTheme.panel.shadow,
  };

  return {
    variables: sharedVariables,
    light: {
      "--mantine-primary-color": theme.other.primaryColor,
      "--mantine-color-body": elevation.surfaces.light.body,
      "--mantine-color-text": theme.colors.neutral[9],

      "--ava-border-default": borderTheme.colors.light.default,
      "--ava-border-strong": borderTheme.colors.light.strong,
      "--ava-border-focus": borderTheme.colors.light.focus,
      "--ava-surface-body": elevation.surfaces.light.body,
      "--ava-surface-raised": elevation.surfaces.light.raised,
      "--ava-surface-overlay": elevation.surfaces.light.overlay,
      "--ava-surface-sunken": elevation.surfaces.light.sunken,
      "--ava-surface-panel-header": elevation.surfaces.light.panelHeader,
    },
    dark: {
      "--mantine-primary-color": theme.other.primaryColor,
      "--mantine-color-body": elevation.surfaces.dark.body,
      "--mantine-color-text": theme.colors.neutral[0],

      "--ava-border-default": borderTheme.colors.dark.default,
      "--ava-border-strong": borderTheme.colors.dark.strong,
      "--ava-border-focus": borderTheme.colors.dark.focus,
      "--ava-surface-body": elevation.surfaces.dark.body,
      "--ava-surface-raised": elevation.surfaces.dark.raised,
      "--ava-surface-overlay": elevation.surfaces.dark.overlay,
      "--ava-surface-sunken": elevation.surfaces.dark.sunken,
      "--ava-surface-panel-header": elevation.surfaces.dark.panelHeader,

      "--mantine-shadow-xs": elevation.shadows.xs,
      "--mantine-shadow-sm": elevation.shadows.sm,
      "--mantine-shadow-md": elevation.shadows.md,
      "--mantine-shadow-lg": elevation.shadows.lg,
      "--mantine-shadow-xl": elevation.shadows.xl,
    },
  };
};

export const ThemeColors = { ...DEFAULT_THEME.colors, ...Theme.colors };
