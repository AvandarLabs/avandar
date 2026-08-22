import { defaultVariantColorsResolver } from "@mantine/core";
import { describe, expect, it } from "vitest";

import {
  ANIMATION_PRESET,
  AnimationTheme,
  APP_CHROME_Z_INDEX,
  APP_SHELL_MAIN_Z_INDEX,
  cssVariablesResolver,
  MODAL_ABOVE_NUX_TOUR_Z_INDEX,
  MODAL_ROOT_Z_INDEX,
  NOTIFICATIONS_Z_INDEX,
  NUX_CHECKLIST_Z_INDEX,
  NUX_TOUR_Z_INDEX,
  POPOVER_Z_INDEX,
  PRODUCT_MODAL_ROOT_CLASSNAME,
  Theme,
} from "@/config/Theme";

import { NEUTRAL_SHADES } from "../../../shared/config/Theme";

describe("Theme modal stacking", () => {
  it("orders app shell → chrome → modal → popover → notifications", () => {
    expect(APP_CHROME_Z_INDEX).toBeGreaterThan(APP_SHELL_MAIN_Z_INDEX);
    expect(MODAL_ROOT_Z_INDEX).toBeGreaterThan(APP_CHROME_Z_INDEX);
    expect(POPOVER_Z_INDEX).toBeGreaterThan(MODAL_ROOT_Z_INDEX);
    expect(NOTIFICATIONS_Z_INDEX).toBeGreaterThan(POPOVER_Z_INDEX);
  });

  it("clears the onboarding tour tooltip, not only its overlay", () => {
    expect(NUX_TOUR_Z_INDEX).toBe(MODAL_ROOT_Z_INDEX);
    expect(MODAL_ABOVE_NUX_TOUR_Z_INDEX).toBeGreaterThan(NUX_TOUR_Z_INDEX + 1);
    expect(POPOVER_Z_INDEX).toBeGreaterThan(MODAL_ABOVE_NUX_TOUR_Z_INDEX);
  });

  it("stacks the tour tooltip above the checklist, and the checklist above the overlay", () => {
    expect(NUX_CHECKLIST_Z_INDEX).toBe(NUX_TOUR_Z_INDEX + 1);
    expect(MODAL_ABOVE_NUX_TOUR_Z_INDEX).toBeGreaterThan(
      NUX_CHECKLIST_Z_INDEX + 1,
    );
    expect(POPOVER_Z_INDEX).toBeGreaterThan(MODAL_ABOVE_NUX_TOUR_Z_INDEX);
  });

  it("registers Modal defaults on the theme", () => {
    const modal = Theme.components?.Modal;
    expect(modal).toBeDefined();
    if (modal === undefined) {
      throw new Error("Expected Theme.components.Modal");
    }
    expect(modal.defaultProps?.zIndex).toBe(MODAL_ROOT_Z_INDEX);
    expect(modal.defaultProps?.classNames?.root).toBe(
      PRODUCT_MODAL_ROOT_CLASSNAME,
    );
  });

  it("exposes the chrome tier on theme.other.zIndex", () => {
    expect(Theme.other.zIndex.appChrome).toBe(APP_CHROME_Z_INDEX);
    expect(Theme.other.zIndex.modal).toBe(MODAL_ROOT_Z_INDEX);
  });
});

describe("Theme design tokens", () => {
  it("registers interactive transitions on primary components", () => {
    expect(Theme.components?.Button).toBeDefined();
    expect(Theme.components?.Paper?.defaultProps?.withBorder).toBe(true);
    expect(Theme.components?.Modal?.defaultProps?.radius).toBe("xl");
    expect(
      Theme.components?.Modal?.defaultProps?.overlayProps?.style
        ?.backdropFilter,
    ).toBe("var(--ava-overlay-backdrop-filter)");
    expect(
      Theme.components?.Modal?.defaultProps?.transitionProps?.duration,
    ).toBe(ANIMATION_PRESET.popIn.durationMs);
  });

  it("exposes overlay pop-in motion as CSS variables", () => {
    const resolved = cssVariablesResolver(Theme);
    expect(resolved.variables["--ava-animation-duration-pop-in"]).toBe(
      `${ANIMATION_PRESET.popIn.durationMs}ms`,
    );
    expect(resolved.variables["--ava-animation-easing-pop"]).toBe(
      AnimationTheme.easing.pop,
    );
    expect(resolved.variables["--ava-animate-pop-in-from-transform"]).toBe(
      ANIMATION_PRESET.popIn.from.transform,
    );
    expect(resolved.variables["--ava-animate-pop-in-from-filter"]).toBe(
      ANIMATION_PRESET.popIn.from.filter,
    );
  });

  it("uses a visible palette border for outline buttons", () => {
    const resolver = Theme.variantColorResolver;
    expect(resolver).toBeDefined();
    if (resolver === undefined) {
      throw new Error("Expected Theme.variantColorResolver");
    }

    const outlineNeutral = resolver({
      color: "neutral",
      variant: "outline",
      theme: Theme,
    });
    const defaultOutline = defaultVariantColorsResolver({
      color: "neutral",
      variant: "outline",
      theme: Theme,
    });

    expect(outlineNeutral.border).toBe(`1px solid ${NEUTRAL_SHADES[4]}`);
    expect(outlineNeutral.border).not.toBe(defaultOutline.border);
  });

  it("animates Combobox dropdowns with the same pop transition as Menu", () => {
    const combobox = Theme.components?.Combobox;
    expect(combobox?.defaultProps?.transitionProps?.transition).toBe("pop");
    expect(combobox?.defaultProps?.transitionProps?.duration).toBe(140);
    expect(
      Theme.components?.Menu?.defaultProps?.transitionProps?.transition,
    ).toBe("pop");
  });
});
