/*
 * The presets nested in the in-scope compositions draw from the theme: a
 * component token patched in a scope reaches the rendered SVG.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { VideoThemeScope } from "../../videoTheme/VideoThemeScope/VideoThemeScope";
import { StockGraphic } from "../StockGraphic";
import type { VideoThemePatch } from "../../videoTheme/videoTheme.types";
import type { StockRequest } from "../contracts/StockContract.types";

/** Renders a stock request at frame 120 with one component's defaults patched. */
function renderPresetWithComponentPatch(
  request: StockRequest,
  name: string,
  defaultProps: VideoThemePatch,
): string {
  const patch: VideoThemePatch = { components: { [name]: { defaultProps } } };
  return renderToStaticMarkup(
    <VideoThemeScope patches={[patch]}>
      <StockGraphic {...request} frame={120} />
    </VideoThemeScope>,
  );
}

test("data-pipeline draws its stage icons at the themed radius", () => {
  assert.match(
    renderPresetWithComponentPatch(
      { preset: "data-pipeline" },
      "DataPipeline",
      {
        iconRadius: 23,
      },
    ),
    /r="23"/,
  );
});

test("predicate-pushdown-boundary dashes its boundary with the themed pattern", () => {
  assert.match(
    renderPresetWithComponentPatch(
      { preset: "predicate-pushdown-boundary" },
      "PredicatePushdownBoundary",
      { boundaryDash: [4, 4] },
    ),
    /stroke-dasharray="4 4"/,
  );
});

test("code-focus draws its window at the themed radius", () => {
  assert.match(
    renderPresetWithComponentPatch({ preset: "code-focus" }, "CodeWindow", {
      radius: 21,
    }),
    /rx="21"/,
  );
});
