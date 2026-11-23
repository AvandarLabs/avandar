import assert from "node:assert/strict";
import test from "node:test";
import {
  getCompositeFieldsFromValue,
  getContrastSummaryFromColors,
  getContrastSummaryFromRatio,
  canPairColorRole,
  isColorPair,
  setColorPairing,
} from "./roleValueHelpers";

test("a colour role with a dark and a light side is a pair", () => {
  assert.equal(
    isColorPair({ onDark: "$colors.gray.0", onLight: "$colors.dark.9" }),
    true,
  );
  assert.equal(isColorPair("$colors.gray.0"), false);
  assert.equal(isColorPair({ onDark: "$colors.gray.0" }), false);
  assert.equal(isColorPair(null), false);
});
test("pairing a colour role starts both sides at its current value", () => {
  assert.deepEqual(
    setColorPairing({
      value: "$color.accent",
      isPaired: true,
    }),
    {
      onDark: "$color.accent",
      onLight: "$color.accent",
    },
  );
});
test("unpairing a colour role keeps its dark-ground side", () => {
  const pair = { onDark: "$colors.gray.0", onLight: "$colors.dark.9" };
  assert.equal(
    setColorPairing({
      value: pair,
      isPaired: false,
    }),
    "$colors.gray.0",
  );
});
test("pairing or unpairing a role that is already that way leaves it alone", () => {
  const pair = { onDark: "$colors.gray.0", onLight: "$colors.dark.9" };
  assert.equal(
    setColorPairing({
      value: pair,
      isPaired: true,
    }),
    pair,
  );
  assert.equal(
    setColorPairing({
      value: "$color.accent",
      isPaired: false,
    }),
    "$color.accent",
  );
});
test("an unset colour role is never paired into undefined sides", () => {
  assert.equal(
    setColorPairing({
      value: undefined,
      isPaired: true,
    }),
    undefined,
  );
  assert.equal(
    setColorPairing({
      value: null,
      isPaired: true,
    }),
    null,
  );
  assert.equal(canPairColorRole(undefined), false);
  assert.equal(canPairColorRole("$color.accent"), true);
});
test("unpairing falls back to the light side when the dark side is unset", () => {
  assert.equal(
    setColorPairing({
      value: { onDark: undefined, onLight: "$colors.dark.9" },
      isPaired: false,
    }),
    "$colors.dark.9",
  );
});
test("white on black passes AAA with its ratio rounded to one decimal", () => {
  assert.deepEqual(
    getContrastSummaryFromColors({
      color: "#ffffff",
      ground: "#000000",
    }),
    {
      level: "AAA",
      ratio: "21.0",
    },
  );
});
test("a ratio between 3 and 4.5 fails for body text but passes AA for large text", () => {
  const body = getContrastSummaryFromColors({
    color: "#888888",
    ground: "#ffffff",
  });
  const large = getContrastSummaryFromColors({
    color: "#888888",
    ground: "#ffffff",
    style: {
      fontSize: 32,
      fontWeight: 400,
    },
  });
  assert.equal(body.level, "fail");
  assert.equal(large.level, "AA");
  assert.equal(body.ratio, large.ratio);
});
test("a composite's fields are its authored object, or none for anything else", () => {
  assert.deepEqual(getCompositeFieldsFromValue({ size: "$fontSizes.lg" }), {
    size: "$fontSizes.lg",
  });
  assert.deepEqual(getCompositeFieldsFromValue(undefined), {});
  assert.deepEqual(getCompositeFieldsFromValue("$text.stage.title"), {});
  assert.deepEqual(getCompositeFieldsFromValue(["a"]), {});
});
test("body text at exactly 4.5 and 7 reaches AA and AAA", () => {
  assert.deepEqual(
    getContrastSummaryFromRatio({
      ratio: 4.5,
      isLargeText: false,
    }),
    {
      level: "AA",
      ratio: "4.5",
    },
  );
  assert.deepEqual(
    getContrastSummaryFromRatio({
      ratio: 7,
      isLargeText: false,
    }),
    {
      level: "AAA",
      ratio: "7.0",
    },
  );
});
test("a ratio just under a threshold never shows the threshold itself", () => {
  assert.deepEqual(
    getContrastSummaryFromRatio({
      ratio: 4.497,
      isLargeText: false,
    }),
    {
      level: "fail",
      ratio: "4.4",
    },
  );
  assert.deepEqual(
    getContrastSummaryFromRatio({
      ratio: 6.999,
      isLargeText: false,
    }),
    {
      level: "AA",
      ratio: "6.9",
    },
  );
});
