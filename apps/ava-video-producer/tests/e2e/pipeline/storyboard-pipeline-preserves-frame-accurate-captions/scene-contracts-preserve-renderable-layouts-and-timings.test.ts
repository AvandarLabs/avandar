import assert from "node:assert/strict";
import test from "node:test";
import { storyboardSchema } from "../../../../src/storyboard/schema/schema";
import {
  StoryboardPipelineFixtures,
  type StoryboardInput,
} from "./StoryboardPipelineFixtures";

test("scene plans reject typography and flow settings the renderer cannot honor", () => {
  const plan: StoryboardInput = StoryboardPipelineFixtures.makePlan();
  plan.shots[1] = {
    id: "metric",
    scene: "typography",
    durationInFrames: 150,
    props: { lines: ["Read this"], fontSize: 32 },
  };
  assert.equal(storyboardSchema.safeParse(plan).success, false);
  plan.shots[1].props = { lines: ["Read this"], wordStaggerFrames: 1 };
  assert.equal(storyboardSchema.safeParse(plan).success, false);
  plan.shots[1] = {
    id: "metric",
    scene: "flowchart",
    durationInFrames: 150,
    props: {
      steps: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
      connectors: [{ from: "a", to: "b" }],
      stepAtFrames: [10, 10],
    },
  };
  assert.equal(storyboardSchema.safeParse(plan).success, false);
  plan.shots[1].props.stepAtFrames = [10, 80];
  assert.equal(storyboardSchema.safeParse(plan).success, true);
  plan.shots[1].props.connectors = [{ from: "a", to: "a" }];
  assert.equal(storyboardSchema.safeParse(plan).success, false);
});

test("typography accepts staged reveal modes, an icon, an exit and a caption size", () => {
  const plan = StoryboardPipelineFixtures.makePlan();
  plan.shots[1] = {
    id: "metric",
    scene: "typography",
    durationInFrames: 150,
    props: {
      lines: ["One statement"],
      revealMode: "line-fade",
      lineStaggerFrames: 3,
      icon: { src: "avandar/logo.png", size: 160 },
      exit: { atFrame: 120, staggerFrames: 3, durationInFrames: 6 },
    },
  };
  assert.equal(storyboardSchema.safeParse(plan).success, true);
  plan.shots[1].props = {
    lines: ["A caption"],
    revealMode: "cut",
    size: "caption",
  };
  assert.equal(storyboardSchema.safeParse(plan).success, true);
});

test("typography rejects a caption size with a display font size, or an exit past the shot", () => {
  const plan = StoryboardPipelineFixtures.makePlan();
  plan.shots[1] = {
    id: "metric",
    scene: "typography",
    durationInFrames: 150,
    props: { lines: ["A caption"], size: "caption", fontSize: 60 },
  };
  assert.equal(storyboardSchema.safeParse(plan).success, false);
  plan.shots[1].props = { lines: ["Late"], exit: { atFrame: 150 } };
  assert.equal(storyboardSchema.safeParse(plan).success, false);
});

test("a tilted window shot validates a carousel, camera, secondary window and whip exit", () => {
  const plan = StoryboardPipelineFixtures.makePlanFromShot({
    id: "metric",
    scene: "tilted-window",
    durationInFrames: 150,
    props: {
      headlines: [
        { atFrame: 1, lines: ["Map every case"], subtitle: "Live view" },
      ],
      windows: [
        StoryboardPipelineFixtures.screen,
        { ...StoryboardPipelineFixtures.screen, atFrame: 40, swap: "slide" },
        { ...StoryboardPipelineFixtures.screen, atFrame: 70, swap: "cut" },
      ],
      enter: { kind: "whip", atFrame: 1 },
      camera: [
        { at: 0, x: 0, y: 0.5, zoom: 1 },
        { at: 30, x: 0, y: 0.5, zoom: 1 },
        { at: 40, x: 0, y: 0.5, zoom: 1.4, ease: "push" },
      ],
      secondary: {
        ...StoryboardPipelineFixtures.screen,
        box: { x: 0.8, y: 0.4, width: 0.15, height: 0.4 },
        atFrame: 20,
      },
      exit: { kind: "whip-left", atFrame: 140 },
    },
  });
  assert.equal(storyboardSchema.safeParse(plan).success, true);
});

test("a tilted window pair validates two racing columns with a flip-split entrance", () => {
  const column = {
    label: "Before",
    window: StoryboardPipelineFixtures.screen,
    counter: { to: 13.6, unit: "s", startFrame: 8, endFrame: 88 },
  };
  const plan = StoryboardPipelineFixtures.makePlanFromShot({
    id: "metric",
    scene: "tilted-window",
    durationInFrames: 150,
    props: {
      layout: "pair",
      pair: [column, { ...column, label: "After" }],
      enter: { kind: "flip-split" },
    },
  });
  assert.equal(storyboardSchema.safeParse(plan).success, true);
});

test("a tilted window validates a timed whip with a stepped reveal, side entrances and a footnote", () => {
  const single = StoryboardPipelineFixtures.makePlanFromShot({
    id: "metric",
    scene: "tilted-window",
    durationInFrames: 150,
    props: {
      windows: [StoryboardPipelineFixtures.screen],
      enter: {
        kind: "whip",
        atFrame: 16,
        durationInFrames: 12,
        reveal: { columns: 4, durationInFrames: 4 },
      },
      footnote: "Fictional demonstration data",
    },
  });
  assert.equal(storyboardSchema.safeParse(single).success, true);
  const column = {
    label: "Cases",
    window: StoryboardPipelineFixtures.screen,
    counter: { to: 240, precision: 0, startFrame: 6, endFrame: 88 },
  };
  const pair = StoryboardPipelineFixtures.makePlanFromShot({
    id: "metric",
    scene: "tilted-window",
    durationInFrames: 150,
    props: {
      layout: "pair",
      pair: [column, { ...column, label: "Visits" }],
      enter: { kind: "from-sides", atFrame: 0, durationInFrames: 11 },
    },
  });
  assert.equal(storyboardSchema.safeParse(pair).success, true);
  const sidesOnSingle = StoryboardPipelineFixtures.makePlanFromShot({
    id: "metric",
    scene: "tilted-window",
    durationInFrames: 150,
    props: {
      windows: [StoryboardPipelineFixtures.screen],
      enter: { kind: "from-sides" },
    },
  });
  assert.equal(storyboardSchema.safeParse(sidesOnSingle).success, false);
});

test("a tilted window validates a timed whip exit and a tall window box", () => {
  const plan = StoryboardPipelineFixtures.makePlanFromShot({
    id: "metric",
    scene: "tilted-window",
    durationInFrames: 150,
    props: {
      windows: [StoryboardPipelineFixtures.screen],
      windowBox: "tall",
      enter: { kind: "pull-back", atFrame: 40 },
      exit: { kind: "whip-left", atFrame: 140, durationInFrames: 12 },
    },
  });
  assert.equal(storyboardSchema.safeParse(plan).success, true);
  const unknownBox = StoryboardPipelineFixtures.makePlanFromShot({
    id: "metric",
    scene: "tilted-window",
    durationInFrames: 150,
    props: {
      windows: [StoryboardPipelineFixtures.screen],
      windowBox: "wide" as "tall",
    },
  });
  assert.equal(storyboardSchema.safeParse(unknownBox).success, false);
});

test("a graph heading may wipe in line by line from its own frame", () => {
  const plan = StoryboardPipelineFixtures.makePlanFromShot({
    id: "metric",
    scene: "graph",
    durationInFrames: 150,
    props: {
      title: "How the pieces connect",
      kicker: "An editorial diagram",
      headingReveal: { mode: "wipe", atFrame: 7, staggerFrames: 8 },
      nodes: [{ id: "a", label: "A", x: 0.5, y: 0.5 }],
      edges: [],
    },
  });
  assert.equal(storyboardSchema.safeParse(plan).success, true);
});

test("a typography icon may keep its own reveal frame", () => {
  const plan = StoryboardPipelineFixtures.makePlanFromShot({
    id: "metric",
    scene: "typography",
    durationInFrames: 150,
    props: {
      lines: ["Then explore it."],
      revealMode: "line-fade",
      revealAtFrame: 17,
      icon: { src: "avandar/logo.png", size: 154, atFrame: 0 },
    },
  });
  assert.equal(storyboardSchema.safeParse(plan).success, true);
});

test("a tilted window rejects layouts and timings it cannot render", () => {
  const props = [
    { windows: [{ ...StoryboardPipelineFixtures.screen, atFrame: 5 }] },
    {
      windows: [
        StoryboardPipelineFixtures.screen,
        { ...StoryboardPipelineFixtures.screen, atFrame: 50 },
        { ...StoryboardPipelineFixtures.screen, atFrame: 40 },
      ],
    },
    { layout: "pair" as const, windows: [StoryboardPipelineFixtures.screen] },
    {
      windows: [StoryboardPipelineFixtures.screen],
      enter: { kind: "flip-split" as const },
    },
    {
      windows: [StoryboardPipelineFixtures.screen],
      exit: { kind: "whip-left" as const, atFrame: 150 },
    },
    { headlines: [{ atFrame: 1, lines: ["A"] }] },
  ];
  Array.from(props).forEach((value) => {
    const plan = StoryboardPipelineFixtures.makePlanFromShot({
      id: "metric",
      scene: "tilted-window",
      durationInFrames: 150,
      props: value,
    });
    assert.equal(
      storyboardSchema.safeParse(plan).success,
      false,
      JSON.stringify(value),
    );
  });
});

test("a brand lockup validates a column build, a CTA and a fly-through exit", () => {
  const plan = StoryboardPipelineFixtures.makePlanFromShot({
    id: "metric",
    scene: "brand-lockup",
    durationInFrames: 150,
    props: {
      logo: { src: "avandar/logo.png", aspectRatio: 1 },
      wordmark: "Avandar",
      build: { atFrame: 5, columns: 8, staggerFrames: 1.5 },
      cta: {
        atFrame: 30,
        subtitle: "Open source",
        url: "avandar.example",
        command: "pnpm add avandar",
      },
      exit: { kind: "fly-through", atFrame: 120, color: "brand" },
    },
  });
  assert.equal(storyboardSchema.safeParse(plan).success, true);
});

test("a brand lockup rejects an unknown fly-through colour or an exit past the shot", () => {
  Array.from([
    { kind: "fly-through", atFrame: 120, color: "accent" },
    { kind: "fly-through", atFrame: 150 },
  ]).forEach((exit) => {
    const plan = StoryboardPipelineFixtures.makePlanFromShot({
      id: "metric",
      scene: "brand-lockup",
      durationInFrames: 150,
      props: { logo: { src: "avandar/logo.png" }, exit } as never,
    });
    assert.equal(
      storyboardSchema.safeParse(plan).success,
      false,
      JSON.stringify(exit),
    );
  });
});

test("a bar comparison validates two panels and rejects negative bars or a third panel", () => {
  const panel = {
    value: 13.6,
    precision: 1,
    unit: "s",
    caption: "Time to first chart",
    rows: [
      { label: "This build", value: 13.6, highlight: true },
      { label: "Baseline", value: 21 },
    ],
  };
  const props = {
    panels: [panel, panel],
    exit: { kind: "erase" as const, atFrame: 100 },
  };
  const shot = {
    id: "metric",
    scene: "bar-comparison" as const,
    durationInFrames: 150,
    props,
  };
  assert.equal(
    storyboardSchema.safeParse(
      StoryboardPipelineFixtures.makePlanFromShot(shot),
    ).success,
    true,
  );
  const negative = { ...panel, rows: [{ label: "Bad", value: -1 }] };
  Array.from([[negative], [panel, panel, panel]]).forEach((panels) => {
    assert.equal(
      storyboardSchema.safeParse(
        StoryboardPipelineFixtures.makePlanFromShot({
          ...shot,
          props: { panels },
        }),
      ).success,
      false,
    );
  });
});
