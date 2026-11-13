import assert from "node:assert/strict";
import test from "node:test";
import {
  buildColorWithAlpha,
  elevationToBoxShadow,
  elevationToDropShadowFilter,
  fillToCss,
  textShadowToCss,
} from "./cssValues";

const FLOATING = {
  layers: [{ offsetX: 0, offsetY: 16, blur: 22, spread: 0, alpha: 1 }],
  color: "#06101455",
};

test("an opaque colour keeps its value", () => {
  assert.equal(buildColorWithAlpha("#51a7ff", 1), "#51a7ff");
});

test("a translucent colour mixes toward transparent", () => {
  assert.equal(buildColorWithAlpha("#51a7ff", 0.25), "color-mix(in srgb, #51a7ff 25%, transparent)");
});

test("an elevation becomes a box shadow with every layer", () => {
  assert.equal(elevationToBoxShadow(FLOATING), "0px 16px 22px 0px #06101455");
});

test("an elevation becomes a drop-shadow filter", () => {
  assert.equal(elevationToDropShadowFilter(FLOATING), "drop-shadow(0px 16px 22px #06101455)");
});

test("an elevation with no layers casts no shadow", () => {
  assert.equal(elevationToBoxShadow({ layers: [], color: "#000000" }), "none");
  assert.equal(elevationToDropShadowFilter({ layers: [], color: "#000000" }), "none");
});

test("a text shadow applies its alpha to its colour", () => {
  assert.equal(
    textShadowToCss({ offsetX: 0, offsetY: 2, blur: 4, alpha: 0.5, color: "#000000" }),
    "0px 2px 4px color-mix(in srgb, #000000 50%, transparent)",
  );
});

test("a gradient fill becomes a linear gradient", () => {
  assert.equal(
    fillToCss({ type: "gradient", from: "#0b1219", to: "#142632", deg: 180 }),
    "linear-gradient(180deg, #0b1219, #142632)",
  );
});
