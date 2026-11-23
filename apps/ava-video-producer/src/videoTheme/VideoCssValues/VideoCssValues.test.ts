import assert from "node:assert/strict";
import test from "node:test";
import { VideoCssValues } from "./VideoCssValues";

const FLOATING = {
  layers: [{ offsetX: 0, offsetY: 16, blur: 22, spread: 0, alpha: 1 }],
  color: "#06101455",
};
test("an opaque colour keeps its value", () => {
  assert.equal(
    VideoCssValues.makeColorFromAlpha({
      color: "#51a7ff",
      alpha: 1,
    }),
    "#51a7ff",
  );
});
test("a translucent colour mixes toward transparent", () => {
  assert.equal(
    VideoCssValues.makeColorFromAlpha({
      color: "#51a7ff",
      alpha: 0.25,
    }),
    "color-mix(in srgb, #51a7ff 25%, transparent)",
  );
});
test("a single elevation layer becomes a box shadow", () => {
  assert.equal(
    VideoCssValues.makeBoxShadowFromElevation(FLOATING),
    "0px 16px 22px 0px #06101455",
  );
});
test("an elevation becomes a drop-shadow filter", () => {
  assert.equal(
    VideoCssValues.makeDropShadowFilterFromElevation(FLOATING),
    "drop-shadow(0px 16px 22px #06101455)",
  );
});
test("an elevation with no layers casts no shadow", () => {
  assert.equal(
    VideoCssValues.makeBoxShadowFromElevation({ layers: [], color: "#000000" }),
    "none",
  );
  assert.equal(
    VideoCssValues.makeDropShadowFilterFromElevation({
      layers: [],
      color: "#000000",
    }),
    "none",
  );
});
test("a text shadow applies its alpha to its colour", () => {
  assert.equal(
    VideoCssValues.makeCssFromTextShadow({
      offsetX: 0,
      offsetY: 2,
      blur: 4,
      alpha: 0.5,
      color: "#000000",
    }),
    "0px 2px 4px color-mix(in srgb, #000000 50%, transparent)",
  );
});
test("a gradient fill becomes a linear gradient", () => {
  assert.equal(
    VideoCssValues.makeCssFromFill({
      type: "gradient",
      from: "#0b1219",
      to: "#142632",
      deg: 180,
    }),
    "linear-gradient(180deg, #0b1219, #142632)",
  );
});
