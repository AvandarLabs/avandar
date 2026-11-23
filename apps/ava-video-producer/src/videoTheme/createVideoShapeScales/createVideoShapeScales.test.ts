import assert from "node:assert/strict";
import test from "node:test";
import { makeResolvedVideoThemeFromLibrary } from "../makeResolvedVideoThemeFromLibrary/makeResolvedVideoThemeFromLibrary";
import { makeVideoShapeScalesFromSemanticTokens } from "../makeVideoShapeScalesFromSemanticTokens/makeVideoShapeScalesFromSemanticTokens";
import { BUILT_IN_VIDEO_THEMES } from "../makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";

function _scalesWith(multipliers: Readonly<Record<string, string>>) {
  const semantic = makeResolvedVideoThemeFromLibrary({
    library: BUILT_IN_VIDEO_THEMES,
    themeId: "classic",
    scope: {
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
  }).semantic;
  return makeVideoShapeScalesFromSemanticTokens(semantic);
}
test("classic draws widths, radii, and washes as authored", () => {
  const scales = makeVideoShapeScalesFromSemanticTokens(
    makeResolvedVideoThemeFromLibrary({
      library: BUILT_IN_VIDEO_THEMES,
      themeId: "classic",
    }).semantic,
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
