import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getOverlayPose,
  getAnnotationProgress,
  getConnectorProgress,
} from "./overlayMotion";

test("floating explanation leaves its measured source, settles safely, then returns", () => {
  const source = { x: 387, y: 279, width: 153, height: 323 };
  const target = { x: 680, y: 220, width: 760, height: 400 };
  const cue = { at: 100, until: 300, target };
  const start = getOverlayPose(100, cue, source);
  assert.equal(start.x + target.width / 2, 463.5);
  assert.equal(start.y + target.height / 2, 440.5);
  const hold = getOverlayPose(180, cue, source);
  assert.equal(hold.x, 680);
  assert.equal(hold.y, 220);
  assert.ok(hold.x > source.x + source.width);
  assert.ok(hold.x + target.width <= 1568);
  assert.ok(hold.y + target.height <= 780);
  assert.equal(getOverlayPose(300, cue, source).opacity, 0);
  assert.equal(getOverlayPose(300, cue, source).x, start.x);
});

test("notation draws after its cue and disappears at its authored end", () => {
  const cue = { at: 100, until: 200 };
  assert.equal(getAnnotationProgress(99, cue), 0);
  assert.ok(getAnnotationProgress(109, cue) > 0);
  assert.equal(getAnnotationProgress(150, cue), 1);
  assert.equal(getAnnotationProgress(200, cue), 0);
});

import { readFileSync, readdirSync } from "node:fs";
import { continuitySchema } from "./continuitySchema";

test("all authored overlays stay in safe stage space and clear their measured source", () => {
  const folder = new URL("../../storyboards/explainers/", import.meta.url);
  for (const file of readdirSync(folder).filter((name) =>
    name.endsWith(".json"),
  )) {
    const document = JSON.parse(readFileSync(new URL(file, folder), "utf8"));
    const plan = continuitySchema.parse(document.shots[0].props);
    for (const beat of plan.beats) {
      const content = beat.content;
      if (content.kind !== "composite") continue;
      for (const diagram of content.diagrams) {
        assert.ok(diagram.overlay, `${file} has a timed overlay`);
        const { target, at, until } = diagram.overlay;
        assert.ok(at > 0 && until < beat.duration, file);
        assert.ok(target.x >= 32 && target.y >= 90, file);
        assert.ok(
          target.x + target.width <= 1568 && target.y + target.height <= 780,
          file,
        );
        const source = content.source;
        assert.ok(
          target.x >= source.x + source.width ||
            target.y >= source.y + source.height ||
            target.x + target.width <= source.x ||
            target.y + target.height <= source.y,
          file,
        );
      }
    }
  }
});

test("focus and bracket treatments never emit a causal connector", () => {
  assert.equal(getConnectorProgress(300, "focus", 100), 0);
  assert.equal(getConnectorProgress(300, "bracket", 100), 0);
});

test("causal connector starts only at its authored signal cue", () => {
  assert.equal(getConnectorProgress(99, "signal", 100), 0);
  assert.equal(getConnectorProgress(100, "signal", 100), 0);
  assert.ok(getConnectorProgress(115, "signal", 100) > 0);
  assert.equal(getConnectorProgress(130, "signal", 100), 1);
});

test("composites reject diagrams with no visible overlay placement", () => {
  const document = JSON.parse(
    readFileSync(
      new URL(
        "../../storyboards/explainers/film-qetl-composite.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const composite = document.shots[0].props.beats.find(
    (beat: { content: { kind: string } }) => beat.content.kind === "composite",
  );
  delete composite.content.diagrams[0].overlay;
  assert.equal(
    continuitySchema.safeParse(document.shots[0].props).success,
    false,
  );
});

test("slower overlay travel reaches the target later and keeps its end cue", () => {
  const source = { x: 0, y: 0, width: 100, height: 100 };
  const cue = {
    at: 20,
    until: 300,
    target: { x: 400, y: 100, width: 100, height: 100 },
    motion: { speed: 0.5, easing: "linear" as const },
  };
  assert.equal(getOverlayPose(56, cue, source).x, 200);
  assert.equal(getOverlayPose(92, cue, source).x, 400);
  assert.equal(getOverlayPose(300, cue, source).opacity, 0);
});
