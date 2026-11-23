import assert from "node:assert/strict";
import test, { afterEach, mock } from "node:test";
import { PipelineTestFixtures } from "../../../tests/PipelineTestFixtures";
import { loadFilm } from "./loadFilm";

afterEach(() => {
  return mock.restoreAll();
});

function _respond(value: unknown) {
  mock.method(globalThis, "fetch", async () => {
    return new Response(JSON.stringify(value), { status: 200 });
  });
}

const HELPER = {
  id: "cursor",
  source: "helper",
  kind: "helper",
  helper: "cursor",
  assets: [],
  frames: 90,
  fps: 30,
  width: 960,
  height: 600,
  delivery: { width: 960, height: 600 },
  loop: true,
  showCaptions: false,
} as const;

test("helper films retain their transport, dimensions and helper selection", async () => {
  _respond(HELPER);
  assert.deepEqual(await loadFilm("cursor"), HELPER);
});

test("malformed film metadata is rejected before player mounting", async () => {
  for (const value of [
    {},
    { ...HELPER, frames: "90" },
    { ...HELPER, kind: "unknown" },
    { ...HELPER, delivery: {} },
    { ...HELPER, theme: { themeId: 4 } },
    { ...HELPER, plan: {} },
    { ...HELPER, helper: 4 },
    { ...HELPER, assets: [4] },
  ]) {
    _respond(value);
    await assert.rejects(loadFilm("cursor"));
  }
});

test("stock films retain complete authored input and selected render colours", async () => {
  const film = {
    id: "decision",
    source: "stock",
    kind: "stock",
    frames: 180,
    fps: 30,
    width: 960,
    height: 600,
    delivery: { width: 960, height: 600 },
    loop: true,
    showCaptions: false,
    preset: "decision-fork",
    schemaVersion: 1,
    accent: "#123456",
    background: "#abcdef",
    input: {
      prompt: "Choose a route",
      branches: [
        { id: "a", condition: "Option A", outcome: "A result" },
        { id: "b", condition: "Option B", outcome: "B result" },
      ],
      selectedBranchId: "b",
      scenarioLabel: "Example",
      selectionLabel: "Chosen",
      showUnchosenOutcomes: true,
    },
  };
  _respond(film);
  assert.deepEqual(await loadFilm("decision"), film);
});

test("storyboard films preserve their authored shot order and timing", async () => {
  _respond({
    ...HELPER,
    kind: "storyboard",
    plan: PipelineTestFixtures.fixture(),
  });
  const film = await loadFilm("example");
  assert.equal(film.kind, "storyboard");
  assert.deepEqual(
    film.plan?.shots.map((shot) => {
      return {
        id: shot.id,
        frames: shot.durationInFrames,
      };
    }),
    [
      { id: "first", frames: 30 },
      { id: "second", frames: 30 },
    ],
  );
});
