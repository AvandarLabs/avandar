import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  captionFiles,
  applySrt,
  timestamp,
  publicAsset,
  assetReferences,
  previewFrames,
} from "../scripts/lib/planHelpers";
import {
  storyboardSchema,
  timeline,
  absoluteCues,
  durationInFrames,
  assetPathSchema,
  declaredCutFrames,
} from "../src/storyboard/schema/schema";
import type { z } from "zod";

/** The pre-parse shape `storyboardSchema` accepts, before defaults are applied. */
type StoryboardInput = z.input<typeof storyboardSchema>;

function fixture(): StoryboardInput {
  return {
    version: 1,
    id: "test-film",
    title: "Test",
    description: "A fixture",
    sourceNotes: ["Synthetic test"],
    purpose: "standalone",
    fps: 30,
    width: 1600,
    height: 1000,
    delivery: { width: 1536, height: 960 },
    shots: [
      {
        id: "opening",
        scene: "title",
        durationInFrames: 66,
        props: { name: "Test film", kicker: "One source" },
      },
      {
        id: "metric",
        scene: "metric",
        durationInFrames: 150,
        props: { label: "Records", value: 240 },
      },
    ],
    narration: [
      {
        id: "records",
        shotId: "metric",
        startFrame: 0,
        endFrame: 90,
        text: "Two hundred forty records.",
      },
    ],
  };
}

test("one timeline drives duration and frame-accurate SRT/VTT", () => {
  const plan = storyboardSchema.parse(fixture());
  assert.equal(durationInFrames(plan), 216);
  assert.deepEqual(
    timeline(plan).map((shot) => {
      return shot.startFrame;
    }),
    [0, 66],
  );
  assert.equal(absoluteCues(plan)[0].endFrame, 156);
  assert.match(captionFiles(plan).srt, /00:00:02,200 --> 00:00:05,200/);
  assert.match(captionFiles(plan).vtt, /00:00:02\.200 --> 00:00:05\.200/);
  assert.equal(timestamp(29, 30), "00:00:00,967");
});

test("reject invalid IDs, timing, FPS, aspect ratios and unknown fields", () => {
  const changes: Array<(plan: StoryboardInput) => void> = [
    (plan) => {
      return (plan.shots[1].id = "opening");
    },
    // `fps` is a literal 30 in the schema; 24 is deliberately invalid input.
    (plan) => {
      return (plan.fps = 24 as unknown as 30);
    },
    (plan) => {
      return (plan.narration![0].endFrame = 151);
    },
    (plan) => {
      return (plan.narration![0].shotId = "missing");
    },
    (plan) => {
      return (plan.delivery.height = 864);
    },
    // `extra` isn't a schema field; the cast adds just that one field so the
    // rest of the object keeps real type checking.
    (plan) => {
      return ((plan as StoryboardInput & { extra?: string }).extra =
        "silently ignored?");
    },
    (plan) => {
      return (plan.shots[0].durationInFrames = 100);
    },
    (plan) => {
      return plan.narration!.push({
        ...plan.narration![0],
        id: "overlap",
        startFrame: 20,
      });
    },
  ];
  for (const change of changes) {
    const plan = fixture();
    change(plan);
    assert.equal(storyboardSchema.safeParse(plan).success, false);
  }
});

test("reject graph references and out-of-bounds crop/callout rectangles", () => {
  const plan: StoryboardInput = fixture();
  plan.shots[1] = {
    id: "metric",
    scene: "graph",
    durationInFrames: 150,
    props: {
      nodes: [{ id: "a", label: "A", x: 0.3, y: 0.4 }],
      edges: [{ id: "edge", from: "a", to: "missing" }],
    },
  };
  assert.equal(storyboardSchema.safeParse(plan).success, false);
  plan.shots[1] = {
    id: "metric",
    scene: "media",
    durationInFrames: 150,
    props: {
      kind: "image",
      src: "captures/screen.png",
      crop: { x: 0.8, y: 0, width: 0.5, height: 1 },
    },
  };
  assert.equal(storyboardSchema.safeParse(plan).success, false);
});

test("asset paths cannot access credentials, traverse, or load external resources", () => {
  for (const value of [
    "../.env.local",
    ".env.local",
    "foo/../../bar",
    "/tmp/secret",
    "https://example.com/a.mp4",
    "foo/%2e%2e/bar",
    "C:\\secret",
    "capture.png?token=secret",
  ]) {
    assert.equal(assetPathSchema.safeParse(value).success, false, value);
  }
  assert.equal(
    assetPathSchema.parse("captures/import/screen.png"),
    "captures/import/screen.png",
  );
});

test("public asset resolution rejects a symlink escape", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "video-assets-"));
  try {
    await fs.mkdir(path.join(root, "public"));
    await fs.writeFile(path.join(root, "outside.txt"), "not an asset");
    await fs.symlink(
      path.join(root, "outside.txt"),
      path.join(root, "public", "escape.txt"),
    );
    await assert.rejects(publicAsset(root, "escape.txt"), /inside public/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("SRT alignment preserves narration text and requires cues to fit their shots", () => {
  const plan = storyboardSchema.parse(fixture());
  const aligned = applySrt(
    plan,
    "1\n00:00:02,400 --> 00:00:05,400\nTwo hundred forty records.\n",
    "voice/recorded.wav",
  );
  assert.equal(aligned.narration[0].startFrame, 6);
  assert.equal(aligned.narrationTrack?.src, "voice/recorded.wav");
  assert.throws(() => {
    return applySrt(
      plan,
      "1\n00:00:02,400 --> 00:00:05,400\nDifferent words.\n",
      "voice/recorded.wav",
    );
  }, /differs/);
  assert.throws(() => {
    return applySrt(
      plan,
      "1\n00:00:00,000 --> 00:00:05,400\nTwo hundred forty records.\n",
      "voice/recorded.wav",
    );
  });
});

test("scene plans reject typography and flow settings the renderer cannot honor", () => {
  const plan: StoryboardInput = fixture();
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

test("captioned plans reject a canvas that cannot retain 640px of scene content", () => {
  const plan = fixture();
  plan.narration![0].text =
    "These fictional cases connect to visits, facilities, and districts so teams can inspect source records, compare reported needs, and see which households are still awaiting contact.";
  assert.equal(storyboardSchema.safeParse(plan).success, true);
  plan.width = 960;
  plan.height = 800;
  plan.delivery = { width: 960, height: 800 };
  const small = storyboardSchema.safeParse(plan);
  assert.equal(small.success, false);
  if (!small.success) assert.match(small.error.message, /640px scene height/);
  assert.equal(
    storyboardSchema.safeParse({ ...plan, captions: false }).success,
    true,
  );
  plan.narration![0].text = "A short cue fits.";
  assert.equal(storyboardSchema.safeParse(plan).success, true);
});

test("a shot theme overrides plan tokens with colours or other token references", () => {
  const plan = fixture();
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
  for (const theme of [
    { accent: "#ffffff" },
    { ground: "var(--ground)" },
    { ground: "var(--unknown)" },
    { ground: "red; background: url(x)" },
  ]) {
    const plan = fixture();
    plan.shots[1].theme = theme as StoryboardInput["shots"][number]["theme"];
    assert.equal(
      storyboardSchema.safeParse(plan).success,
      false,
      JSON.stringify(theme),
    );
  }
});

test("a stepped column wipe validates on an incoming shot with transition frames", () => {
  const plan = fixture();
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
  for (const change of changes) {
    const plan = fixture();
    change(plan);
    assert.equal(storyboardSchema.safeParse(plan).success, false);
  }
});

test("a declared cut validates on an incoming shot with no transition frames", () => {
  const plan = fixture();
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
        } as unknown as { kind: "cut" };
      },
      /outgoing/,
    ],
  ];
  for (const [change, message] of cases) {
    const plan = fixture();
    change(plan);
    const result = storyboardSchema.safeParse(plan);
    assert.equal(result.success, false);
    assert.match(JSON.stringify(result.error?.issues), message);
  }
});

test("only shots that declare a cut give the frame gate a cut frame", () => {
  const plan = fixture();
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
  assert.deepEqual(declaredCutFrames(storyboardSchema.parse(plan)), [66, 282]);
  assert.deepEqual(declaredCutFrames(storyboardSchema.parse(fixture())), []);
});

test("typography accepts staged reveal modes, an icon, an exit and a caption size", () => {
  const plan = fixture();
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
  const plan = fixture();
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

function withShot(shot: StoryboardInput["shots"][number]): StoryboardInput {
  const plan = fixture();
  plan.shots[1] = shot;
  return plan;
}

const screen = {
  kind: "image" as const,
  src: "avandar/screens/map-map-cases.png",
};

test("a tilted window shot validates a carousel, camera, secondary window and whip exit", () => {
  const plan = withShot({
    id: "metric",
    scene: "tilted-window",
    durationInFrames: 150,
    props: {
      headlines: [
        { atFrame: 1, lines: ["Map every case"], subtitle: "Live view" },
      ],
      windows: [
        screen,
        { ...screen, atFrame: 40, swap: "slide" },
        { ...screen, atFrame: 70, swap: "cut" },
      ],
      enter: { kind: "whip", atFrame: 1 },
      camera: [
        { at: 0, x: 0, y: 0.5, zoom: 1 },
        { at: 30, x: 0, y: 0.5, zoom: 1 },
        { at: 40, x: 0, y: 0.5, zoom: 1.4, ease: "push" },
      ],
      secondary: {
        ...screen,
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
    window: screen,
    counter: { to: 13.6, unit: "s", startFrame: 8, endFrame: 88 },
  };
  const plan = withShot({
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
  const single = withShot({
    id: "metric",
    scene: "tilted-window",
    durationInFrames: 150,
    props: {
      windows: [screen],
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
    window: screen,
    counter: { to: 240, precision: 0, startFrame: 6, endFrame: 88 },
  };
  const pair = withShot({
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
  const sidesOnSingle = withShot({
    id: "metric",
    scene: "tilted-window",
    durationInFrames: 150,
    props: { windows: [screen], enter: { kind: "from-sides" } },
  });
  assert.equal(storyboardSchema.safeParse(sidesOnSingle).success, false);
});

test("a tilted window validates a timed whip exit and a tall window box", () => {
  const plan = withShot({
    id: "metric",
    scene: "tilted-window",
    durationInFrames: 150,
    props: {
      windows: [screen],
      windowBox: "tall",
      enter: { kind: "pull-back", atFrame: 40 },
      exit: { kind: "whip-left", atFrame: 140, durationInFrames: 12 },
    },
  });
  assert.equal(storyboardSchema.safeParse(plan).success, true);
  const unknownBox = withShot({
    id: "metric",
    scene: "tilted-window",
    durationInFrames: 150,
    props: { windows: [screen], windowBox: "wide" as "tall" },
  });
  assert.equal(storyboardSchema.safeParse(unknownBox).success, false);
});

test("a graph heading may wipe in line by line from its own frame", () => {
  const plan = withShot({
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
  const plan = withShot({
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
    { windows: [{ ...screen, atFrame: 5 }] },
    {
      windows: [screen, { ...screen, atFrame: 50 }, { ...screen, atFrame: 40 }],
    },
    { layout: "pair" as const, windows: [screen] },
    { windows: [screen], enter: { kind: "flip-split" as const } },
    { windows: [screen], exit: { kind: "whip-left" as const, atFrame: 150 } },
    { headlines: [{ atFrame: 1, lines: ["A"] }] },
  ];
  for (const value of props) {
    const plan = withShot({
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
  }
});

test("a brand lockup validates a column build, a CTA and a fly-through exit", () => {
  const plan = withShot({
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
  for (const exit of [
    { kind: "fly-through", atFrame: 120, color: "accent" },
    { kind: "fly-through", atFrame: 150 },
  ]) {
    const plan = withShot({
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
  }
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
  assert.equal(storyboardSchema.safeParse(withShot(shot)).success, true);
  const negative = { ...panel, rows: [{ label: "Bad", value: -1 }] };
  for (const panels of [[negative], [panel, panel, panel]]) {
    assert.equal(
      storyboardSchema.safeParse(withShot({ ...shot, props: { panels } }))
        .success,
      false,
    );
  }
});

test("asset references include window, icon and logo images of the new scenes", () => {
  const plan = fixture();
  plan.shots.push(
    {
      id: "window",
      scene: "tilted-window",
      durationInFrames: 90,
      props: {
        windows: [screen, { kind: "image", src: "a/second.png", atFrame: 30 }],
        secondary: {
          kind: "image",
          src: "a/small.png",
          box: { x: 0.8, y: 0.4, width: 0.1, height: 0.2 },
          atFrame: 10,
        },
      },
    },
    {
      id: "lockup",
      scene: "brand-lockup",
      durationInFrames: 90,
      props: { logo: { src: "a/logo.png" } },
    },
    {
      id: "statement",
      scene: "typography",
      durationInFrames: 90,
      props: { lines: ["Hi"], icon: { src: "a/icon.png" } },
    },
  );
  assert.deepEqual(
    assetReferences(storyboardSchema.parse(plan)).sort(),
    [
      screen.src,
      "a/icon.png",
      "a/logo.png",
      "a/second.png",
      "a/small.png",
    ].sort(),
  );
});

test("previews sample the middle of a scene exit", () => {
  const plan = fixture();
  plan.shots[1] = {
    id: "metric",
    scene: "typography",
    durationInFrames: 150,
    props: { lines: ["Leaving"], exit: { atFrame: 100 } },
  };
  assert.ok(previewFrames(storyboardSchema.parse(plan)).includes(66 + 103));
});

test("previews sample a lockup mid-build and mid-flight, and a window mid-entrance", () => {
  const plan = fixture();
  plan.shots[1] = {
    id: "metric",
    scene: "brand-lockup",
    durationInFrames: 150,
    props: {
      logo: { src: "avandar/logo.png" },
      build: { atFrame: 5 },
      exit: { kind: "fly-through", atFrame: 100 },
    },
  };
  plan.shots.push({
    id: "window",
    scene: "tilted-window",
    durationInFrames: 90,
    props: { windows: [screen], enter: { kind: "pull-back", atFrame: 30 } },
  });
  const frames = previewFrames(storyboardSchema.parse(plan));
  assert.ok(frames.includes(66 + 11), "mid-build");
  assert.ok(frames.includes(66 + 112), "mid-flight");
  assert.ok(frames.includes(216 + 39), "mid-pull-back");
});
