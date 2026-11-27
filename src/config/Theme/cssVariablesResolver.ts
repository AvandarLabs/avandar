import { AnimationTheme } from "./AnimationTheme/AnimationTheme";
import { OverlayTheme } from "./OverlayTheme";
import type { CSSVariablesResolver, MantineTheme } from "@mantine/core";

/** Resolves application CSS variables from the active Mantine theme. */
export const cssVariablesResolver: CSSVariablesResolver = (
  theme: MantineTheme,
) => {
  const { elevation, borders: borderTheme } = theme.other;

  const sharedVariables = {
    /*
     * Narrowest a settings column may get before its grid drops to fewer
     * columns, and so the width every column is guaranteed at any count. With
     * the grid's 1px gaps, N columns appear once the container reaches
     * `N * this + (N - 1)` pixels. The floor is what the widest control in a
     * column needs to stay readable: a filter row (column + operator + value +
     * remove), not a lone Select. `SettingsColumns` reads this unless a caller
     * passes its own floor.
     */
    "--settings-columns-min-width": "280px",
    "--mantine-navbar-background": theme.other.navbar.backgroundColor,
    "--mantine-navbar-color": theme.other.navbar.textColor,
    "--mantine-navbar-hover-background":
      theme.other.navbar.hoverBackgroundColor,
    "--mantine-navbar-active-background":
      theme.other.navbar.activeBackgroundColor,
    "--mantine-navbar-active-hover-background":
      theme.other.navbar.activeHoverBackgroundColor,
    "--navbar-transition-duration": AnimationTheme.duration.fast,

    "--mantine-z-index-app-slate": String(theme.other.zIndex.appSlate),
    "--mantine-z-index-app-chrome": String(theme.other.zIndex.appChrome),
    "--mantine-z-index-floating-panel": String(
      theme.other.zIndex.floatingPanel,
    ),
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
    "--ava-animation-duration-pop-in": `${AnimationTheme.preset.popIn.durationMs}ms`,
    "--ava-animation-duration-reduced": `${AnimationTheme.preset.reducedMotionDurationMs}ms`,
    "--ava-animation-easing-spring": AnimationTheme.preset.oozeIn.easing,
    "--ava-animation-easing-swipe-out": AnimationTheme.preset.swipeOut.easing,
    "--ava-animation-easing-pop": AnimationTheme.easing.pop,
    "--ava-animate-swipe-translate-y": `${AnimationTheme.preset.swipeOut.translateYPx}px`,
    "--ava-animate-pop-in-from-transform":
      AnimationTheme.preset.popIn.from.transform,
    "--ava-animate-pop-in-from-filter": AnimationTheme.preset.popIn.from.filter,

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
