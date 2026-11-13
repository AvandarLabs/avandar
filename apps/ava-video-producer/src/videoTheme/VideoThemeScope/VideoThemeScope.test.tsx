import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_VIDEO_THEME_SOURCE } from "../builtInVideoThemes/builtInVideoThemes";
import { useVideoTokens } from "../useVideoTheme/useVideoTheme";
import { createScopedVideoThemeSource, VideoThemeScope } from "./VideoThemeScope";

function AccentProbe() {
  return <span>{useVideoTokens().color.accentAlt}</span>;
}

const CYAN_PATCH = { other: { video: { atomic: { swatch: { cyan: "#123456" } } } } };

test("a nested override ranks below the outer one", () => {
  const outer = { ...DEFAULT_VIDEO_THEME_SOURCE, scope: { overrideIds: ["aperture-detail"] } };
  const inner = createScopedVideoThemeSource(outer, { overrideIds: ["network-graph"] });
  assert.deepEqual(inner.scope?.overrideIds, ["network-graph", "aperture-detail"]);
});

test("inner patches apply after outer patches", () => {
  const outer = { ...DEFAULT_VIDEO_THEME_SOURCE, scope: { patches: [{ a: 1 }] } };
  const inner = createScopedVideoThemeSource(outer, { patches: [{ b: 2 }] });
  assert.deepEqual(inner.scope?.patches, [{ a: 1 }, { b: 2 }]);
});

test("a scope outside any provider starts from classic and applies its patches", () => {
  const markup = renderToStaticMarkup(
    <VideoThemeScope patches={[CYAN_PATCH]}>
      <AccentProbe />
    </VideoThemeScope>,
  );
  assert.equal(markup, "<span>#123456</span>");
});
