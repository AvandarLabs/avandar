import { describe, expect, it } from "vitest";
import { resolveRenderJitterSalt } from "@/views/GisApp/layers/resolveRenderJitterSalt/resolveRenderJitterSalt";

describe("resolveRenderJitterSalt", () => {
  it("keeps the map's own salt for an editor", () => {
    expect(resolveRenderJitterSalt("map-salt")).toBe("map-salt");
  });

  it("makes a fresh random salt when the viewer cannot read the map's", () => {
    const firstSalt = resolveRenderJitterSalt(undefined);
    const secondSalt = resolveRenderJitterSalt(undefined);

    expect(firstSalt).toMatch(/^[0-9a-f-]{36}$/);
    expect(secondSalt).not.toBe(firstSalt);
  });
});
