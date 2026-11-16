import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StockGraphic } from "../../stock/StockGraphic/StockGraphic";
import { VideoThemeScope } from "../../videoTheme/VideoThemeScope/VideoThemeScope";

/** Sketches boxes at a test roughness, through an atomic step the box profile points at. */
function _withBoxRoughness(
  boxRoughness: number,
  element: ReturnType<typeof createElement>,
) {
  const box = {
    roughness: "$atomic.roughness.testBox",
    bowing: "$atomic.bowing.md",
    seed: "$atomic.seed.md",
    randomness: "$atomic.randomness.md",
  };
  return createElement(VideoThemeScope, {
    patches: [
      {
        other: {
          video: {
            atomic: { roughness: { testBox: boxRoughness } },
            semantic: { sketch: { box } },
          },
        },
      },
    ],
    children: element,
  });
}

test("overlay graphics omit only their stage ground and retain diagram objects", () => {
  const request = { preset: "data-pipeline" as const, frame: 120 };
  const opaque = renderToStaticMarkup(createElement(StockGraphic, request));
  const transparent = renderToStaticMarkup(
    createElement(StockGraphic, { ...request, transparent: true }),
  );
  assert.match(opaque, /<rect width="960" height="600" fill="#0b1219"/);
  assert.doesNotMatch(
    transparent,
    /<rect width="960" height="600" fill="#0b1219"/,
  );
  assert.match(transparent, /Deliver/);
  assert.match(transparent, /background:transparent/);
});

test("rough boxes change diagram outlines without changing text or the stage ground", () => {
  const request = { preset: "data-pipeline" as const, frame: 120 };
  const smooth = renderToStaticMarkup(createElement(StockGraphic, request));
  const rough = renderToStaticMarkup(
    _withBoxRoughness(2, createElement(StockGraphic, request)),
  );
  assert.notEqual(rough, smooth);
  assert.match(rough, /data-rough-box/);
  assert.match(rough, /<rect width="960" height="600" fill="#0b1219"/);
  assert.deepEqual(
    rough.match(/<text[^>]*>.*?<\/text>/g),
    smooth.match(/<text[^>]*>.*?<\/text>/g),
  );
  assert.equal(
    rough,
    renderToStaticMarkup(
      _withBoxRoughness(2, createElement(StockGraphic, request)),
    ),
  );
  assert.equal(
    smooth,
    renderToStaticMarkup(
      _withBoxRoughness(0, createElement(StockGraphic, request)),
    ),
  );
});

test("sketch mode also roughens animated emphasis outlines on diagram boxes", () => {
  const markup = renderToStaticMarkup(
    _withBoxRoughness(
      1.5,
      createElement(StockGraphic, { preset: "data-pipeline", frame: 120 }),
    ),
  );
  assert.doesNotMatch(markup, /<rect[^>]*stroke=/);
});
