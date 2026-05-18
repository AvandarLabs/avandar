import { defaultVariantColorsResolver } from "@mantine/core";
import { describe, expect, it } from "vitest";
import {
  APP_SHELL_MAIN_Z_INDEX,
  MODAL_ROOT_Z_INDEX,
  Theme,
} from "@/config/Theme";
import { NEUTRAL_SHADES } from "../../../shared/config/Theme";

describe("Theme modal stacking", () => {
  it("keeps modal layer above AppShell main z-index", () => {
    expect(MODAL_ROOT_Z_INDEX).toBeGreaterThan(APP_SHELL_MAIN_Z_INDEX);
  });

  it("registers Modal defaults on the theme", () => {
    const modal = Theme.components?.Modal;
    expect(modal).toBeDefined();
    if (modal === undefined) {
      throw new Error("Expected Theme.components.Modal");
    }
    expect(modal.defaultProps?.zIndex).toBe(MODAL_ROOT_Z_INDEX);
  });
});

describe("Theme design tokens", () => {
  it("exposes animation, elevation, and border tokens on theme.other", () => {
    expect(Theme.other.animation.duration.fast).toBe("140ms");
    expect(Theme.other.elevation.surfaces.light.raised).toBe("#ffffff");
    expect(Theme.other.borders.colors.light.default).toContain("rgba");
  });

  it("registers interactive transitions on primary components", () => {
    expect(Theme.components?.Button).toBeDefined();
    expect(Theme.components?.Paper?.defaultProps?.withBorder).toBe(true);
    expect(Theme.components?.Modal?.defaultProps?.overlayProps?.blur).toBe(0);
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
