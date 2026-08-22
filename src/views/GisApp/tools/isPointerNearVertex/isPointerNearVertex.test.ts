import { describe, expect, it } from "vitest";

import { isPointerNearVertex } from "@/views/GisApp/tools/isPointerNearVertex/isPointerNearVertex";

function _identityProject(vertex: readonly [number, number]): {
  x: number;
  y: number;
} {
  return { x: vertex[0], y: vertex[1] };
}

describe("isPointerNearVertex", () => {
  it("is true when the pointer is inside the snap radius", () => {
    expect(
      isPointerNearVertex({
        pointer: { x: 3, y: 4 },
        vertex: [0, 0],
        project: _identityProject,
        radiusPx: 5,
      }),
    ).toBe(true);
  });

  it("is false when the pointer is outside the snap radius", () => {
    expect(
      isPointerNearVertex({
        pointer: { x: 6, y: 0 },
        vertex: [0, 0],
        project: _identityProject,
        radiusPx: 5,
      }),
    ).toBe(false);
  });
});
