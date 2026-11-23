import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { VideoThemeScope } from "../../videoTheme/VideoThemeScope/VideoThemeScope";
import { StockGraphic } from "../StockGraphic/StockGraphic";
import type { VideoThemePatch } from "../../videoTheme/videoTheme.types";
import type { StockRequest } from "../contracts/StockContract.types";
/** Renders a stock request at frame 120 inside a theme patch. */
function _renderPresetWithPatch({
  request,
  patch,
}: Readonly<{
  request: StockRequest;
  patch: VideoThemePatch;
}>): string {
  return renderToStaticMarkup(
    <VideoThemeScope patches={[patch]}>
      <StockGraphic {...request} frame={120} />
    </VideoThemeScope>,
  );
}
function _componentPatch({
  name,
  defaultProps,
}: Readonly<{
  name: string;
  defaultProps: VideoThemePatch;
}>): VideoThemePatch {
  return { components: { [name]: { defaultProps } } };
}
test("network-graph draws its highlighted edges at the themed opacity", () => {
  assert.match(
    _renderPresetWithPatch({
      request: { preset: "network-graph" },
      patch: _componentPatch({
        name: "NetworkGraph",
        defaultProps: { highlightEdgeAlpha: 0.37 },
      }),
    }),
    /opacity="0.37"/,
  );
});
test("node-traversal draws off-route nodes in the inactive colour", () => {
  assert.match(
    _renderPresetWithPatch({
      request: { preset: "node-traversal" },
      patch: { other: { video: { atomic: { swatch: { muted: "#a1b2c3" } } } } },
    }),
    /stroke="#a1b2c3"/,
  );
});
test("radial-network draws its hub glow at the themed opacity", () => {
  assert.match(
    _renderPresetWithPatch({
      request: { preset: "radial-network" },
      patch: _componentPatch({
        name: "RadialNetwork",
        defaultProps: { hubGlowAlpha: 0.21 },
      }),
    }),
    /fill-opacity="0.21"/,
  );
});
test("plexus-field draws links at the themed width", () => {
  assert.match(
    _renderPresetWithPatch({
      request: { preset: "plexus-field" },
      patch: _componentPatch({
        name: "PlexusField",
        defaultProps: { linkWidth: 2.25 },
      }),
    }),
    /stroke-width="2.25"/,
  );
});
test("orbital-system draws its core at the themed radius", () => {
  assert.match(
    _renderPresetWithPatch({
      request: { preset: "orbital-system" },
      patch: _componentPatch({
        name: "OrbitalSystem",
        defaultProps: { coreRadius: 44 },
      }),
    }),
    /r="44"/,
  );
});
test("an orbit colour can follow the theme through a colour role", async () => {
  const { orbitalSystemInputSchema } =
    await import("../presets/OrbitalSystem/OrbitalSystem.schema");
  const body = {
    rx: 120,
    ry: 80,
    angle: 0,
    color: "$color.highlight",
    phase: 0,
    label: "Body",
  };
  assert.equal(
    orbitalSystemInputSchema.shape.bodies.element.safeParse(body).success,
    true,
  );
});
