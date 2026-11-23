import {
  ActionIcon,
  Autocomplete,
  Button,
  Card,
  Combobox,
  createTheme,
  DEFAULT_THEME,
  defaultVariantColorsResolver,
  Drawer,
  Input,
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
import {
  APP_CHROME_Z_INDEX,
  APP_SLATE_Z_INDEX,
  DEFAULT_MODAL_PROPS,
  FLOATING_PANEL_Z_INDEX,
  MODAL_ROOT_Z_INDEX,
  NOTIFICATIONS_Z_INDEX,
  POPOVER_Z_INDEX,
} from "./Theme.constants";
import { THEME_COLOR_SHADES } from "./ThemeColors.constants";
// Imported by direct path (not the `@ui` alias) because tailwind.config.js
// loads this module through jiti, which does not resolve the Vite-only `@ui`
// alias. Using `@ui` here breaks tailwind's CSS build.
import type {
  ButtonProps,
  MantineTheme,
  VariantColorResolverResult,
  VariantColorsResolverInput,
} from "@mantine/core";

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
            ...(props.variant === "default"
              ? {
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
          // Theme styles render inline, so no CSS module class can override
          // them. A Paper that needs a different edge (the slate, on the dark
          // shell) sets `--ava-paper-border-color` from its own CSS instead.
          borderColor:
            "var(--ava-paper-border-color, var(--ava-border-default))",
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

  colors: THEME_COLOR_SHADES,

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
      appSlate: APP_SLATE_Z_INDEX,
      appChrome: APP_CHROME_Z_INDEX,
      floatingPanel: FLOATING_PANEL_Z_INDEX,
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

export const ThemeColors = { ...DEFAULT_THEME.colors, ...Theme.colors };

export { cssVariablesResolver } from "./cssVariablesResolver";

export {
  APP_CHAT_ASIDE_Z_INDEX,
  APP_CHROME_Z_INDEX,
  APP_SLATE_Z_INDEX,
  DEFAULT_MODAL_PROPS,
  FLOATING_PANEL_Z_INDEX,
  MODAL_ABOVE_NUX_TOUR_Z_INDEX,
  MODAL_ROOT_Z_INDEX,
  NOTIFICATIONS_Z_INDEX,
  NUX_CHECKLIST_Z_INDEX,
  NUX_TOUR_Z_INDEX,
  POPOVER_Z_INDEX,
  PRODUCT_MODAL_ROOT_CLASSNAME,
  PRODUCT_MODAL_ROOT_SELECTOR,
} from "./Theme.constants";
