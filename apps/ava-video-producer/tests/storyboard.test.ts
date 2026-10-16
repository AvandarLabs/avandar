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
} from "../scripts/lib/planHelpers";
import {
  storyboardSchema,
  timeline,
  absoluteCues,
  durationInFrames,
  assetPathSchema,
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
    timeline(plan).map((shot) => shot.startFrame),
    [0, 66],
  );
  assert.equal(absoluteCues(plan)[0].endFrame, 156);
  assert.match(captionFiles(plan).srt, /00:00:02,200 --> 00:00:05,200/);
  assert.match(captionFiles(plan).vtt, /00:00:02\.200 --> 00:00:05\.200/);
  assert.equal(timestamp(29, 30), "00:00:00,967");
});

test("reject invalid IDs, timing, FPS, aspect ratios and unknown fields", () => {
  const changes: Array<(plan: StoryboardInput) => void> = [
    (plan) => (plan.shots[1].id = "opening"),
    // `fps` is a literal 30 in the schema; 24 is deliberately invalid input.
    (plan) => (plan.fps = 24 as unknown as 30),
    (plan) => (plan.narration![0].endFrame = 151),
    (plan) => (plan.narration![0].shotId = "missing"),
    (plan) => (plan.delivery.height = 864),
    // `extra` isn't a schema field; the cast adds just that one field so the
    // rest of the object keeps real type checking.
    (plan) =>
      ((plan as StoryboardInput & { extra?: string }).extra =
        "silently ignored?"),
    (plan) => (plan.shots[0].durationInFrames = 100),
    (plan) =>
      plan.narration!.push({
        ...plan.narration![0],
        id: "overlap",
        startFrame: 20,
      }),
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
  assert.throws(
    () =>
      applySrt(
        plan,
        "1\n00:00:02,400 --> 00:00:05,400\nDifferent words.\n",
        "voice/recorded.wav",
      ),
    /differs/,
  );
  assert.throws(() =>
    applySrt(
      plan,
      "1\n00:00:00,000 --> 00:00:05,400\nTwo hundred forty records.\n",
      "voice/recorded.wav",
    ),
  );
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
