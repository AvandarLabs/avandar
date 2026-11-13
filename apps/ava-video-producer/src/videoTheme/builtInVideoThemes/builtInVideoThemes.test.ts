import assert from "node:assert/strict";
import test from "node:test";
import classicJson from "../../../themes/classic.theme.json";
import { DEFAULT_ACCENT, DEFAULT_BACKGROUND } from "../../gallery/palette";
import { DUR, EASE, pop, STAGGER, STAGGER_COLUMN } from "../../motion";
import {
  getVelocityBlur,
  MOTION_PRESETS,
  resolveMotionSettings,
} from "../../motion-components/motionSettings";
import { STOCK } from "../../stock/stockPalette";
import { createEasingFromToken } from "../createEasingFromToken/createEasingFromToken";
import { BUILT_IN_VIDEO_THEMES } from "./builtInVideoThemes";
import type { EasingValue } from "../videoTheme.types";

const atomic = classicJson.other.video.atomic;
const semantic = classicJson.other.video.semantic;
const SAMPLES = Array.from({ length: 21 }, (_, index) => index / 20);

test("classic's swatches equal the stock palette", () => {
  for (const [name, color] of Object.entries(STOCK)) {
    assert.equal(atomic.swatch[name as keyof typeof atomic.swatch], color, name);
  }
});

test("classic's durations equal DUR", () => {
  assert.deepEqual(
    {
      press: atomic.duration["2xs"],
      chip: atomic.duration.xs,
      whip: atomic.duration.sm,
      panel: atomic.duration.md,
      sheet: atomic.duration.lg,
      word: atomic.duration.xl,
      hero: atomic.duration["2xl"],
    },
    { ...DUR },
  );
});

test("classic's curves equal EASE", () => {
  for (const [name, curve] of Object.entries(EASE)) {
    const easing = createEasingFromToken(
      atomic.easing[name as keyof typeof atomic.easing] as EasingValue,
    );
    for (const progress of SAMPLES) {
      assert.ok(Math.abs(easing(progress) - curve(progress)) < 1e-12, name);
    }
  }
});

test("classic's staggers equal STAGGER and STAGGER_COLUMN", () => {
  assert.equal(atomic.stagger.sm, STAGGER);
  assert.equal(atomic.stagger.xs, STAGGER_COLUMN);
});

test("classic's spring lands exactly like pop's default spring", () => {
  for (let frame = 0; frame <= DUR.sheet; frame += 1) {
    assert.equal(pop(frame, 0, atomic.spring.pop, atomic.duration.lg), pop(frame, 0));
  }
});

test("classic's camera presets equal MOTION_PRESETS", () => {
  for (const [name, preset] of Object.entries(MOTION_PRESETS)) {
    const key = name as keyof typeof atomic.cameraSpeed;
    assert.equal(atomic.cameraSpeed[key], preset.speed, name);
    assert.equal(atomic.shutter[key], preset.shutterAngle, name);
    assert.equal(
      semantic.camera.presets[key].easing,
      preset.easing === "ease-in-out" ? "$atomic.easing.inOut" : "$atomic.easing.inOutCubic",
      name,
    );
  }
});

test("classic's blur samples equal the motion settings default", () => {
  assert.equal(atomic.samples.md, resolveMotionSettings().samples);
});

test("classic's velocity blur equals getVelocityBlur", () => {
  for (const distance of [0, 10, 40, 100]) {
    assert.ok(
      Math.abs(
        getVelocityBlur(distance) -
          Math.min(atomic.velocityBlur.max, distance * atomic.velocityBlur.factor),
      ) < 1e-12,
      String(distance),
    );
  }
});

test("classic's accent and ground are the Atlas gallery defaults", () => {
  assert.equal(classicJson.colors.primary[classicJson.primaryShade.dark], DEFAULT_ACCENT);
  assert.equal(atomic.swatch.ground, DEFAULT_BACKGROUND);
});

test("the built-in library holds classic", () => {
  assert.equal(BUILT_IN_VIDEO_THEMES.get("classic")?.label, "Classic");
});
