import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { VideoThemeScope } from "../../videoTheme/VideoThemeScope/VideoThemeScope";
import { StockGraphic } from "../StockGraphic";
import type { VideoThemePatch } from "../../videoTheme/videoTheme.types";
import type { StockRequest } from "../contracts/StockContract.types";

/** Renders a stock request at frame 120 inside a theme patch. */
function renderPresetWithPatch(
  request: StockRequest,
  patch: VideoThemePatch,
): string {
  return renderToStaticMarkup(
    <VideoThemeScope patches={[patch]}>
      <StockGraphic {...request} frame={120} />
    </VideoThemeScope>,
  );
}

function _componentPatch(
  name: string,
  defaultProps: VideoThemePatch,
): VideoThemePatch {
  return { components: { [name]: { defaultProps } } };
}

test("network-graph draws its highlighted edges at the themed opacity", () => {
  assert.match(
    renderPresetWithPatch(
      { preset: "network-graph" },
      _componentPatch("NetworkGraph", { highlightEdgeAlpha: 0.37 }),
    ),
    /opacity="0.37"/,
  );
});
