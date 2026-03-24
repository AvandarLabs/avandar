import { describe, expect, it } from "vitest";
import { MODAL_ROOT_Z_INDEX, Theme } from "./Theme";

describe("Theme modal stacking", () => {
  it("keeps modal layer above AppShell main (z-index 201)", () => {
    expect(MODAL_ROOT_Z_INDEX).toBeGreaterThan(201);
  });

  it("registers Modal defaults on the theme", () => {
    expect(Theme.components?.Modal).toBeDefined();
    expect(Theme.components?.Modal?.defaultProps?.zIndex).toBe(
      MODAL_ROOT_Z_INDEX,
    );
  });
});
