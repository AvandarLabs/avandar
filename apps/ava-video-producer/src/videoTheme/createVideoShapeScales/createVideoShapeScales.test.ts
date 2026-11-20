import assert from "node:assert/strict";
import test from "node:test";
import { BUILT_IN_VIDEO_THEMES } from "../builtInVideoThemes/builtInVideoThemes";
import { makeResolvedVideoThemeFromLibrary } from "../makeResolvedVideoThemeFromLibrary/makeResolvedVideoThemeFromLibrary";
import { createVideoShapeScales } from "./createVideoShapeScales";

function _scalesWith(multipliers: Readonly<Record<string, string>>) {
  const semantic = makeResolvedVideoThemeFromLibrary(
    BUILT_IN_VIDEO_THEMES,
    "classic",
    {
      patches: [
        {
          other: {
            video: {
              atomic: { multiplier: { double: 2, none: 0 } },
              semantic: {
                stroke: { scale: multipliers.stroke },
                corner: { scale: multipliers.corner },
                alpha: { washScale: multipliers.wash },
              },
            },
          },
        },
      ],
    },
  ).semantic;
  return createVideoShapeScales(semantic);
}

test("classic draws widths, radii, and washes as authored", () => {
  const scales = createVideoShapeScales(
    makeResolvedVideoThemeFromLibrary(BUILT_IN_VIDEO_THEMES, "classic")
      .semantic,
  );
  assert.deepEqual(
    [scales.stroke(3), scales.corner(5), scales.wash(0.09)],
    [3, 5, 0.09],
  );
});

test("the Look and feel multipliers reach shape-specific values", () => {
  const scales = _scalesWith({
    stroke: "$atomic.multiplier.double",
    corner: "$atomic.multiplier.none",
    wash: "$atomic.multiplier.double",
  });
  assert.deepEqual(
    [scales.stroke(3), scales.corner(5), scales.wash(0.6)],
    [6, 0, 1],
  );
});
