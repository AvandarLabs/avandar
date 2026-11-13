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

test("node-traversal draws off-route nodes in the inactive colour", () => {
  assert.match(
    renderPresetWithPatch(
      { preset: "node-traversal" },
      { other: { video: { atomic: { swatch: { muted: "#a1b2c3" } } } } },
    ),
    /stroke="#a1b2c3"/,
  );
});

test("radial-network draws its hub glow at the themed opacity", () => {
  assert.match(
    renderPresetWithPatch(
      { preset: "radial-network" },
      _componentPatch("RadialNetwork", { hubGlowAlpha: 0.21 }),
    ),
    /fill-opacity="0.21"/,
  );
});

test("plexus-field draws links at the themed width", () => {
  assert.match(
    renderPresetWithPatch(
      { preset: "plexus-field" },
      _componentPatch("PlexusField", { linkWidth: 2.25 }),
    ),
    /stroke-width="2.25"/,
  );
});

test("orbital-system draws its core at the themed radius", () => {
  assert.match(
    renderPresetWithPatch(
      { preset: "orbital-system" },
      _componentPatch("OrbitalSystem", { coreRadius: 44 }),
    ),
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
