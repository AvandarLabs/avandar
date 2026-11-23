import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { getOverlayPose } from "../../motion-components/getOverlayPose";
import { StageTheme } from "../../scenes/StageTheme/StageTheme";
import { continuitySchema } from "../continuitySchema/continuitySchema";
import { OverlayMotion } from "./OverlayMotion";

const motion = StageTheme.getClassicStageMotion();

/** The draw timings the continuity stage passes in `classic`. */
const ANNOTATION = { duration: 18, easing: motion.reveal.easing };

const CONNECTOR = { duration: 30, easing: motion.travel.easing };

test("floating explanation leaves its measured source, settles safely, then returns", () => {
  const source = { x: 387, y: 279, width: 153, height: 323 };
  const target = { x: 680, y: 220, width: 760, height: 400 };
  const cue = { at: 100, until: 300, target };
  const start = getOverlayPose({ frame: 100, cue, source });
  assert.equal(start.x + target.width / 2, 463.5);
  assert.equal(start.y + target.height / 2, 440.5);
  const hold = getOverlayPose({ frame: 180, cue, source });
  assert.equal(hold.x, 680);
  assert.equal(hold.y, 220);
  assert.ok(hold.x > source.x + source.width);
  assert.ok(hold.x + target.width <= 1568);
  assert.ok(hold.y + target.height <= 780);
  assert.equal(getOverlayPose({ frame: 300, cue, source }).opacity, 0);
  assert.equal(getOverlayPose({ frame: 300, cue, source }).x, start.x);
});

test("notation draws after its cue and disappears at its authored end", () => {
  const cue = { at: 100, until: 200 };
  assert.equal(
    OverlayMotion.getAnnotationProgress({ frame: 99, cue, timing: ANNOTATION }),
    0,
  );
  assert.ok(
    OverlayMotion.getAnnotationProgress({
      frame: 109,
      cue,
      timing: ANNOTATION,
    }) > 0,
  );
  assert.equal(
    OverlayMotion.getAnnotationProgress({
      frame: 150,
      cue,
      timing: ANNOTATION,
    }),
    1,
  );
  assert.equal(
    OverlayMotion.getAnnotationProgress({
      frame: 200,
      cue,
      timing: ANNOTATION,
    }),
    0,
  );
});

test("all authored overlays stay in safe stage space and clear their measured source", () => {
  const folder = new URL("../../../storyboards/explainers/", import.meta.url);
  Array.from(
    readdirSync(folder).filter((name) => {
      return name.endsWith(".json");
    }),
  ).forEach((file) => {
    const document = JSON.parse(readFileSync(new URL(file, folder), "utf8"));
    const plan = continuitySchema.parse(document.shots[0].props);
    Array.from(plan.beats).forEach((beat) => {
      const content = beat.content;
      if (content.kind === "composite") {
        content.diagrams.forEach((diagram) => {
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
        });
      }
    });
  });
});

test("focus and bracket treatments never emit a causal connector", () => {
  assert.equal(
    OverlayMotion.getConnectorProgress({
      frame: 300,
      effect: "focus",
      signalAt: 100,
      timing: CONNECTOR,
    }),
    0,
  );
  assert.equal(
    OverlayMotion.getConnectorProgress({
      frame: 300,
      effect: "bracket",
      signalAt: 100,
      timing: CONNECTOR,
    }),
    0,
  );
});

test("causal connector starts only at its authored signal cue", () => {
  assert.equal(
    OverlayMotion.getConnectorProgress({
      frame: 99,
      effect: "signal",
      signalAt: 100,
      timing: CONNECTOR,
    }),
    0,
  );
  assert.equal(
    OverlayMotion.getConnectorProgress({
      frame: 100,
      effect: "signal",
      signalAt: 100,
      timing: CONNECTOR,
    }),
    0,
  );
  assert.ok(
    OverlayMotion.getConnectorProgress({
      frame: 115,
      effect: "signal",
      signalAt: 100,
      timing: CONNECTOR,
    }) > 0,
  );
  assert.equal(
    OverlayMotion.getConnectorProgress({
      frame: 130,
      effect: "signal",
      signalAt: 100,
      timing: CONNECTOR,
    }),
    1,
  );
});

test("composites reject diagrams with no visible overlay placement", () => {
  const document = JSON.parse(
    readFileSync(
      new URL(
        "../../../storyboards/explainers/film-qetl-composite.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const composite = document.shots[0].props.beats.find(
    (beat: {
      content: {
        kind: string;
      };
    }) => {
      return beat.content.kind === "composite";
    },
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
  assert.equal(getOverlayPose({ frame: 56, cue, source }).x, 200);
  assert.equal(getOverlayPose({ frame: 92, cue, source }).x, 400);
  assert.equal(getOverlayPose({ frame: 300, cue, source }).opacity, 0);
});

test("a longer themed draw-in slows an annotation's arrival", () => {
  const cue = { at: 0, until: 200 };
  assert.ok(
    OverlayMotion.getAnnotationProgress({
      frame: 9,
      cue,
      timing: { ...ANNOTATION, duration: 36 },
    }) <
      OverlayMotion.getAnnotationProgress({
        frame: 9,
        cue,
        timing: ANNOTATION,
      }),
  );
});

test("a connector's themed timing sets its draw-in", () => {
  const linear = (progress: number) => {
    return progress;
  };
  assert.equal(
    OverlayMotion.getConnectorProgress({
      frame: 10,
      effect: "signal",
      signalAt: 0,
      timing: { duration: 20, easing: linear },
    }),
    0.5,
  );
});
