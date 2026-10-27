import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StockGraphic } from "../../stock/StockGraphic";

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
    createElement(StockGraphic, { ...request, boxRoughness: 2 }),
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
      createElement(StockGraphic, { ...request, boxRoughness: 2 }),
    ),
  );
  assert.equal(
    smooth,
    renderToStaticMarkup(
      createElement(StockGraphic, { ...request, boxRoughness: 0 }),
    ),
  );
});

test("sketch mode also roughens animated emphasis outlines on diagram boxes", () => {
  const markup = renderToStaticMarkup(
    createElement(StockGraphic, {
      preset: "data-pipeline",
      frame: 120,
      boxRoughness: 1.5,
    }),
  );
  assert.doesNotMatch(markup, /<rect[^>]*stroke=/);
});
