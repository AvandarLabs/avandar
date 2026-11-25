import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { prop } from "@avandar/utils";
import { applySrt } from "../../../../scripts/lib/planHelpers/applySrt";
import { getPreviewFramesFromPlan } from "../../../../scripts/lib/planHelpers/getPreviewFramesFromPlan";
import { makeCaptionFilesFromPlan } from "../../../../scripts/lib/planHelpers/makeCaptionFilesFromPlan";
import { makeTimestampFromFrame } from "../../../../scripts/lib/planHelpers/makeTimestampFromFrame";
import {
  getAssetReferencesFromPlan,
  getPublicAssetPathFromAsset,
} from "../../../../scripts/lib/planHelpers/planHelpers";
import {
  storyboardSchema,
  assetPathSchema,
} from "../../../../src/storyboard/schema/schema";
import { StoryboardTimeline } from "../../../../src/storyboard/schema/StoryboardTimeline";
import {
  StoryboardPipelineFixtures,
  type StoryboardInput,
} from "./StoryboardPipelineFixtures";

test("one timeline drives duration and frame-accurate SRT/VTT", () => {
  const plan = storyboardSchema.parse(StoryboardPipelineFixtures.makePlan());
  assert.equal(StoryboardTimeline.durationInFrames(plan), 216);
  assert.deepEqual(
    StoryboardTimeline.timeline(plan).map(prop("startFrame")),
    [0, 66],
  );
  assert.equal(StoryboardTimeline.absoluteCues(plan)[0].endFrame, 156);
  assert.match(
    makeCaptionFilesFromPlan(plan).srt,
    /00:00:02,200 --> 00:00:05,200/,
  );
  assert.match(
    makeCaptionFilesFromPlan(plan).vtt,
    /00:00:02\.200 --> 00:00:05\.200/,
  );
  assert.equal(makeTimestampFromFrame({ frame: 29, fps: 30 }), "00:00:00,967");
});

test("reject invalid IDs, timing, FPS, aspect ratios and unknown fields", () => {
  const changes: Array<(plan: StoryboardInput) => void> = [
    (plan) => {
      return (plan.shots[1].id = "opening");
    },
    // `fps` is a literal 30 in the schema; 24 is deliberately invalid input.
    (plan) => {
      return (plan.fps = 24 as 30);
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
      return ((
        plan as StoryboardInput & {
          extra?: string;
        }
      ).extra = "silently ignored?");
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
  Array.from(changes).forEach((change) => {
    const plan = StoryboardPipelineFixtures.makePlan();
    change(plan);
    assert.equal(storyboardSchema.safeParse(plan).success, false);
  });
});

test("reject graph references and out-of-bounds crop/callout rectangles", () => {
  const plan: StoryboardInput = StoryboardPipelineFixtures.makePlan();
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
  [
    "../.env.local",
    ".env.local",
    "foo/../../bar",
    "/tmp/secret",
    "https://example.com/a.mp4",
    "foo/%2e%2e/bar",
    "C:\\secret",
    "capture.png?token=secret",
  ].forEach((value) => {
    assert.equal(assetPathSchema.safeParse(value).success, false, value);
  });
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
    await assert.rejects(
      getPublicAssetPathFromAsset({
        root,
        asset: "escape.txt",
      }),
      /inside public/,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("SRT alignment preserves narration text and requires cues to fit their shots", () => {
  const plan = storyboardSchema.parse(StoryboardPipelineFixtures.makePlan());
  const aligned = applySrt({
    plan,
    srt: "1\n00:00:02,400 --> 00:00:05,400\nTwo hundred forty records.\n",
    audio: "voice/recorded.wav",
  });
  assert.equal(aligned.narration[0].startFrame, 6);
  assert.equal(aligned.narrationTrack?.src, "voice/recorded.wav");
  assert.throws(() => {
    return applySrt({
      plan,
      srt: "1\n00:00:02,400 --> 00:00:05,400\nDifferent words.\n",
      audio: "voice/recorded.wav",
    });
  }, /differs/);
  assert.throws(() => {
    return applySrt({
      plan,
      srt: "1\n00:00:00,000 --> 00:00:05,400\nTwo hundred forty records.\n",
      audio: "voice/recorded.wav",
    });
  });
});

test("captioned plans reject a canvas that cannot retain 640px of scene content", () => {
  const plan = StoryboardPipelineFixtures.makePlan();
  plan.narration![0].text =
    "These fictional cases connect to visits, facilities, and districts so teams can inspect source records, compare reported needs, and see which households are still awaiting contact.";
  assert.equal(storyboardSchema.safeParse(plan).success, true);
  plan.width = 960;
  plan.height = 800;
  plan.delivery = { width: 960, height: 800 };
  const small = storyboardSchema.safeParse(plan);
  assert.equal(small.success, false);
  if (!small.success) {
    assert.match(small.error.message, /640px scene height/);
  }
  assert.equal(
    storyboardSchema.safeParse({ ...plan, captions: false }).success,
    true,
  );
  plan.narration![0].text = "A short cue fits.";
  assert.equal(storyboardSchema.safeParse(plan).success, true);
});

test("asset references include window, icon and logo images of the new scenes", () => {
  const plan = StoryboardPipelineFixtures.makePlan();
  plan.shots.push(
    {
      id: "window",
      scene: "tilted-window",
      durationInFrames: 90,
      props: {
        windows: [
          StoryboardPipelineFixtures.screen,
          { kind: "image", src: "a/second.png", atFrame: 30 },
        ],
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
    getAssetReferencesFromPlan(storyboardSchema.parse(plan)).sort(),
    [
      StoryboardPipelineFixtures.screen.src,
      "a/icon.png",
      "a/logo.png",
      "a/second.png",
      "a/small.png",
    ].sort(),
  );
});

test("previews sample the middle of a scene exit", () => {
  const plan = StoryboardPipelineFixtures.makePlan();
  plan.shots[1] = {
    id: "metric",
    scene: "typography",
    durationInFrames: 150,
    props: { lines: ["Leaving"], exit: { atFrame: 100 } },
  };
  assert.ok(
    getPreviewFramesFromPlan(storyboardSchema.parse(plan)).includes(66 + 103),
  );
});

test("previews sample a lockup mid-build and mid-flight, and a window mid-entrance", () => {
  const plan = StoryboardPipelineFixtures.makePlan();
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
    props: {
      windows: [StoryboardPipelineFixtures.screen],
      enter: { kind: "pull-back", atFrame: 30 },
    },
  });
  const frames = getPreviewFramesFromPlan(storyboardSchema.parse(plan));
  assert.ok(frames.includes(66 + 11), "mid-build");
  assert.ok(frames.includes(66 + 112), "mid-flight");
  assert.ok(frames.includes(216 + 39), "mid-pull-back");
});
