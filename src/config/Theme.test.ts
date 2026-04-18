import { describe, expect, it } from "vitest";
import {
  APP_SHELL_MAIN_Z_INDEX,
  MODAL_ROOT_Z_INDEX,
  Theme,
} from "@/config/Theme";

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
