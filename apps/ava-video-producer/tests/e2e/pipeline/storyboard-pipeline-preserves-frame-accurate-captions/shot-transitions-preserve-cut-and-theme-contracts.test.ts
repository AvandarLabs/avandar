import assert from "node:assert/strict";
import test from "node:test";
import { storyboardSchema } from "../../../../src/storyboard/schema/schema";
import { StoryboardTimeline } from "../../../../src/storyboard/schema/StoryboardTimeline";
import {
  StoryboardPipelineFixtures,
  type StoryboardInput,
} from "./StoryboardPipelineFixtures";

test("a shot theme overrides plan tokens with colours or other token references", () => {
  const plan = StoryboardPipelineFixtures.makePlan();
  plan.theme = { ground: "#0d0e11", brand: "#1563fe" };
  plan.shots[1].theme = { ground: "var(--brand)", foreground: "#0d0e11" };
  const parsed = storyboardSchema.parse(plan);
  assert.deepEqual(parsed.shots[1].theme, {
    ground: "var(--brand)",
    foreground: "#0d0e11",
  });
  assert.equal(parsed.shots[0].theme, undefined);
});

test("a shot theme rejects unknown tokens, self references and raw CSS", () => {
  Array.from([
    { accent: "#ffffff" },
    { ground: "var(--ground)" },
    { ground: "var(--unknown)" },
    { ground: "red; background: url(x)" },
  ]).forEach((theme) => {
    const plan = StoryboardPipelineFixtures.makePlan();
    plan.shots[1].theme = theme;
    assert.equal(
      storyboardSchema.safeParse(plan).success,
      false,
      JSON.stringify(theme),
    );
  });
});

test("a stepped column wipe validates on an incoming shot with transition frames", () => {
  const plan = StoryboardPipelineFixtures.makePlan();
  plan.shots[1].transitionInFrames = 8;
  plan.shots[1].transition = {
    kind: "stepped-column-wipe",
    columns: 8,
    staggerFrames: 0.5,
    from: "bottom",
    order: "left-to-right",
    outgoing: "playing",
    outgoingDrift: { x: -0.06, blur: 12 },
  };
  assert.equal(storyboardSchema.safeParse(plan).success, true);
});

test("a shot transition is rejected on a hard cut, the first shot, or when columns cannot finish", () => {
  const changes: Array<(plan: StoryboardInput) => void> = [
    (plan) => {
      plan.shots[1].transitionInFrames = 0;
      plan.shots[1].transition = { kind: "stepped-column-wipe" };
    },
    (plan) => {
      plan.shots[0].transition = { kind: "dissolve" };
    },
    (plan) => {
      plan.shots[1].transitionInFrames = 4;
      plan.shots[1].transition = {
        kind: "stepped-column-wipe",
        columns: 12,
        staggerFrames: 1,
      };
    },
  ];
  Array.from(changes).forEach((change) => {
    const plan = StoryboardPipelineFixtures.makePlan();
    change(plan);
    assert.equal(storyboardSchema.safeParse(plan).success, false);
  });
});

test("a declared cut validates on an incoming shot with no transition frames", () => {
  const plan = StoryboardPipelineFixtures.makePlan();
  plan.shots[1].transitionInFrames = 0;
  plan.shots[1].transition = { kind: "cut" };
  assert.equal(storyboardSchema.safeParse(plan).success, true);
});

test("a declared cut is rejected with transition frames, on the first shot, or with options", () => {
  const cases: Array<[(plan: StoryboardInput) => void, RegExp]> = [
    [
      (plan) => {
        plan.shots[1].transition = { kind: "cut" };
      },
      /metric: a cut needs transitionInFrames set to 0/,
    ],
    [
      (plan) => {
        plan.shots[0].transitionInFrames = 0;
        plan.shots[0].transition = { kind: "cut" };
      },
      /opening: the first shot has nothing to transition from/,
    ],
    [
      (plan) => {
        plan.shots[1].transitionInFrames = 0;
        plan.shots[1].transition = {
          kind: "cut",
          outgoing: "playing",
        } as {
          kind: "cut";
        };
      },
      /outgoing/,
    ],
  ];
  Array.from(cases).forEach(([change, message]) => {
    const plan = StoryboardPipelineFixtures.makePlan();
    change(plan);
    const result = storyboardSchema.safeParse(plan);
    assert.equal(result.success, false);
    assert.match(JSON.stringify(result.error?.issues), message);
  });
});

test("only shots that declare a cut give the frame gate a cut frame", () => {
  const plan = StoryboardPipelineFixtures.makePlan();
  plan.shots.push(
    {
      id: "undeclared",
      scene: "title",
      durationInFrames: 66,
      transitionInFrames: 0,
      props: { name: "Hard cut", kicker: "Not declared" },
    },
    {
      id: "declared",
      scene: "title",
      durationInFrames: 66,
      transitionInFrames: 0,
      transition: { kind: "cut" },
      props: { name: "Hard cut", kicker: "Declared" },
    },
  );
  plan.shots[1].transitionInFrames = 0;
  plan.shots[1].transition = { kind: "cut" };
  assert.deepEqual(
    StoryboardTimeline.declaredCutFrames(storyboardSchema.parse(plan)),
    [66, 282],
  );
  assert.deepEqual(
    StoryboardTimeline.declaredCutFrames(
      storyboardSchema.parse(StoryboardPipelineFixtures.makePlan()),
    ),
    [],
  );
});
