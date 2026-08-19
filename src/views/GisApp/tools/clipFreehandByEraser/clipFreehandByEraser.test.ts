import { describe, expect, it } from "vitest";
import { clipFreehandByEraser } from "@/views/GisApp/tools/clipFreehandByEraser/clipFreehandByEraser";

function _identityProject(vertex: readonly [number, number]): {
  x: number;
  y: number;
} {
  return { x: vertex[0], y: vertex[1] };
}

function _identityUnproject(point: { x: number; y: number }): [number, number] {
  return [point.x, point.y];
}

describe("clipFreehandByEraser", () => {
  it("splits a stroke where the brush crosses the middle", () => {
    const pieces = clipFreehandByEraser({
      coordinates: [
        [0, 0],
        [10, 0],
        [20, 0],
      ],
      eraser: { x: 10, y: 0 },
      radiusPx: 2,
      project: _identityProject,
      unproject: _identityUnproject,
    });
    expect(pieces.length).toBe(2);
    expect(pieces[0]?.[0]).toEqual([0, 0]);
    expect(pieces[1]?.at(-1)).toEqual([20, 0]);
    expect(
      pieces.every((piece) => {
        return piece.every((vertex) => {
          const distance = Math.hypot(vertex[0] - 10, vertex[1]);
          return distance >= 2 - 1e-6;
        });
      }),
    ).toBe(true);
  });

  it("deletes a stroke that lies entirely in the brush", () => {
    expect(
      clipFreehandByEraser({
        coordinates: [
          [9, 0],
          [10, 0],
          [11, 0],
        ],
        eraser: { x: 10, y: 0 },
        radiusPx: 5,
        project: _identityProject,
        unproject: _identityUnproject,
      }),
    ).toEqual([]);
  });
});
