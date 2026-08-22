import { describe, expect, it } from "vitest";

import { mapToolCursor } from "@/views/GisApp/tools/mapToolCursor/mapToolCursor";

describe("mapToolCursor", () => {
  it("uses grab cursors for Select and Alt-pan", () => {
    expect(
      mapToolCursor({
        mapToolMode: { type: "pan" },
        isAltPanHeld: false,
        isPointerDown: false,
      }),
    ).toBe("grab");
    expect(
      mapToolCursor({
        mapToolMode: { type: "pan" },
        isAltPanHeld: false,
        isPointerDown: true,
      }),
    ).toBe("grabbing");
    expect(
      mapToolCursor({
        mapToolMode: { type: "aoi" },
        isAltPanHeld: true,
        isPointerDown: false,
      }),
    ).toBe("grab");
  });

  it("uses a tool cursor when a drawing tool is armed", () => {
    expect(
      mapToolCursor({
        mapToolMode: { type: "aoi" },
        isAltPanHeld: false,
        isPointerDown: false,
      }),
    ).toBe("crosshair");
    expect(
      mapToolCursor({
        mapToolMode: { type: "annotate", kind: "text" },
        isAltPanHeld: false,
        isPointerDown: false,
      }),
    ).toBe("text");
    expect(
      mapToolCursor({
        mapToolMode: { type: "erase" },
        isAltPanHeld: false,
        isPointerDown: false,
      }),
    ).toBe("cell");
  });

  it("gives each annotation kind its own cursor", () => {
    const cursors = (["arrow", "freehand", "area", "text"] as const).map(
      (kind) => {
        return mapToolCursor({
          mapToolMode: { type: "annotate", kind },
          isAltPanHeld: false,
          isPointerDown: false,
        });
      },
    );
    expect(new Set(cursors).size).toBe(cursors.length);
    cursors.slice(0, 3).forEach((cursor) => {
      expect(cursor).toContain("data:image/svg+xml,");
      expect(cursor).toMatch(/ 10 10, crosshair$/);
    });
  });
});
