import assert from "node:assert/strict";
import test from "node:test";
import productFilm from "../../storyboards/explainers/film-ontology-to-product.json";
import film from "../../storyboards/explainers/film-qetl-motion.json";
import { storyboardSchema } from "../storyboard/schema/schema";
import { continuitySchema, productSegmentSchema } from "./continuitySchema";

test("a shared-object handoff rejects changed identity", () => {
  const plan = structuredClone(film.shots[0].props);
  plan.beats[2].token!.label = "A different object";
  assert.equal(continuitySchema.safeParse(plan).success, false);
});
test("a product segment cannot outlive its adapter's authored state", () => {
  assert.equal(
    productSegmentSchema.safeParse({
      feature: "ontology",
      fromFrame: 0,
      toFrame: 700,
    }).success,
    false,
  );
});
test("a continuity shot cannot truncate its last beat", () => {
  const plan = structuredClone(film);
  plan.shots[0].durationInFrames -= 1;
  assert.equal(storyboardSchema.safeParse(plan).success, false);
});
test("native-scale continuity products reject a different stage geometry", () => {
  const plan = structuredClone(productFilm);
  plan.width = 1920;
  plan.height = 1080;
  plan.delivery = { width: 1920, height: 1080 };
  assert.equal(storyboardSchema.safeParse(plan).success, false);
});

test("aperture reveals require an explicit origin inside the stage", () => {
  const plan = structuredClone(film.shots[0].props);
  plan.beats[1].transition = { kind: "aperture", frames: 24 };
  assert.equal(continuitySchema.safeParse(plan).success, false);
});

test("retiming an overlap moves downstream beat-relative narration with the picture", async () => {
  const { absoluteCues } = await import("../storyboard/schema/timeline");
  const plan = structuredClone(film);
  plan.narration = [
    {
      id: "relative",
      shotId: "explanation",
      beatId: "selection",
      startFrame: 40,
      endFrame: 140,
      text: "A question determines the required data.",
    },
  ] as typeof plan.narration;
  const original = storyboardSchema.parse(plan);
  plan.shots[0].props.beats[1].transition.frames += 6;
  plan.shots[0].durationInFrames -= 6;
  const changed = storyboardSchema.parse(plan);
  assert.equal(
    absoluteCues(changed)[0].startFrame,
    absoluteCues(original)[0].startFrame - 6,
  );
});

test("slower camera routes must fit the beat including their preserved holds", () => {
  const plan = continuitySchema.parse(film.shots[0].props);
  const content = plan.beats[1].content;
  assert.ok(content.kind === "stock");
  content.cameraOptions = { speed: 0.5, easing: "ease-in-out" };
  assert.equal(continuitySchema.safeParse(plan).success, false);
  plan.beats[1].duration += 100;
  assert.equal(continuitySchema.safeParse(plan).success, true);
});

test("transition presets shift beat-relative narration by their resolved overlap", async () => {
  const { absoluteCues } = await import("../storyboard/schema/timeline");
  const plan = storyboardSchema.parse(film);
  plan.narration = [
    {
      id: "relative",
      shotId: "explanation",
      beatId: "selection",
      startFrame: 40,
      endFrame: 140,
      text: "The question selects the data.",
    },
  ];
  const before = absoluteCues(plan)[0].startFrame;
  const shot = plan.shots[0];
  assert.ok(shot.scene === "continuity");
  shot.props.beats[1].transition.motion = { speed: 0.5 };
  shot.durationInFrames -= 24;
  const changed = storyboardSchema.parse(plan);
  assert.equal(absoluteCues(changed)[0].startFrame, before - 24);
});

test("invalid camera speed returns validation errors instead of throwing", () => {
  const plan = continuitySchema.parse(film.shots[0].props);
  const content = plan.beats[1].content;
  assert.ok(content.kind === "stock");
  content.cameraOptions = { speed: 0 };
  assert.equal(continuitySchema.safeParse(plan).success, false);
});

test("invalid object speed returns validation errors instead of throwing", () => {
  const plan = continuitySchema.parse(film.shots[0].props);
  const content = plan.beats[1].content;
  assert.ok(content.kind === "stock");
  content.flight = {
    at: 20,
    duration: 24,
    dx: 300,
    dy: -60,
    rect: { x: 0, y: 0, width: 200, height: 100 },
    motion: { speed: 0 },
  };
  assert.equal(continuitySchema.safeParse(plan).success, false);
});

test("unordered camera keys return validation errors instead of throwing", () => {
  const plan = continuitySchema.parse(film.shots[0].props);
  const content = plan.beats[1].content;
  assert.ok(content.kind === "stock" && content.camera);
  content.camera[2].at = 1;
  assert.equal(continuitySchema.safeParse(plan).success, false);
});
