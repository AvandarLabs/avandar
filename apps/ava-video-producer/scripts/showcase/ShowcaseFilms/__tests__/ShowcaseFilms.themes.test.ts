import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { ContinuityThemePlans } from "../../../../src/continuity/ContinuityThemePlans/ContinuityThemePlans";
import { DRAFT_THEME_ID } from "../../../../src/videoTheme/makeDraftThemeTargetFromLibrary/makeDraftThemeTargetFromLibrary";
import { VideoThemeSnapshots } from "../../../../src/videoTheme/VideoThemeSnapshots/VideoThemeSnapshots";
import { ShowcaseFilms } from "../ShowcaseFilms";

test("explainer caption selection preserves the overlap-aware film duration", async () => {
  const film = await ShowcaseFilms.load({
    id: "qetl-motion",
    rawOptions: { captions: false },
  });
  assert.equal(film.kind, "storyboard");
  assert.equal(film.showCaptions, false);
  assert.equal(film.plan?.captions, true);
  assert.equal(film.frames, 1542);
  assert.equal(film.loop, false);
});

test("continuity appearance options preserve the timeline", async () => {
  const { original, film } = await _getContinuityThemeFilmFixtures();
  assert.equal(film.frames, original.frames);
  assert.deepEqual(film.plan?.narration, original.plan?.narration);
  const shot = film.plan?.shots.find((candidate) => {
    return candidate.scene === "continuity";
  });
  assert.equal(shot?.scene === "continuity" && "accent" in shot.props, false);
  assert.equal(shot?.scene === "continuity" && shot.props.cameraMotion, false);
  const theme = VideoThemeSnapshots.toResolvedTheme({
    snapshot: film.theme,
    overrideIds: [film.id],
  });
  assert.equal(theme.semantic.color.ground, "#ffffff");
  await assert.rejects(
    ShowcaseFilms.load({
      id: "avandar-home",
      rawOptions: { cameraMotion: false },
    }),
  );
});

test("camera preset exports include the complete extended timeline", async () => {
  const { original, adjusted } = await _getCameraPresetFilmFixtures();
  assert.ok(adjusted.frames > original.frames);
  const drawn = ContinuityThemePlans.fromVideoThemeSnapshot({
    plan: adjusted.plan!,
    snapshot: adjusted.theme,
    overrideIds: [adjusted.id],
  });
  assert.equal(
    adjusted.frames,
    drawn.shots.reduce((total, shot) => {
      return total + shot.durationInFrames;
    }, 0),
  );
  const shot = drawn.shots[0];
  assert.equal(
    shot.scene === "continuity" &&
      shot.props.beats[0].content.kind === "stock" &&
      shot.props.beats[0].content.cameraOptions?.speed,
    0.25,
  );
  await assert.rejects(
    ShowcaseFilms.load({
      id: "shared-object-handoff",
      rawOptions: {
        theme: {
          id: "classic",
          patch: {
            other: { video: { semantic: { camera: { preset: "fast" } } } },
          },
        },
      },
    }),
  );
});

test("continuity films refuse colour options; colours come from the theme", async () => {
  await assert.rejects(
    ShowcaseFilms.load({
      id: "shared-object-handoff",
      rawOptions: { accent: "#ff0000" },
    }),
    /theme/,
  );
});

test("a film without a theme option carries the classic snapshot", async () => {
  const film = await ShowcaseFilms.load({ id: "occlusion-wipe" });
  assert.deepEqual(film.theme, {
    themeId: "classic",
    documents: [],
    patches: [],
  });
});

test("a draft on a built-in theme renders as the unsaved theme that extends it", async () => {
  const patch = {
    other: { video: { atomic: { swatch: { ground: "#201510" } } } },
  };
  const film = await ShowcaseFilms.load({
    id: "stock-network-graph",
    rawOptions: {
      theme: { id: "avandar", patch },
    },
  });
  assert.equal(film.theme?.themeId, DRAFT_THEME_ID);
  assert.deepEqual(film.theme?.documents.map(prop("extends")), ["avandar"]);
  assert.deepEqual(film.theme?.patches, [patch]);
});

test("loading a themed stock film retains its preset", async () => {
  const film = await ShowcaseFilms.load({
    id: "stock-network-graph",
    rawOptions: {
      theme: { id: "avandar" },
    },
  });
  assert.equal(film.kind === "stock" && film.preset, "network-graph");
});

test("an unknown theme is refused", async () => {
  await assert.rejects(
    ShowcaseFilms.load({
      id: "occlusion-wipe",
      rawOptions: { theme: { id: "missing" } },
    }),
  );
});

test("loading a themed continuity film retains the requested theme id", async () => {
  const film = await ShowcaseFilms.load({
    id: "qetl-motion",
    rawOptions: {
      theme: { id: "avandar" },
    },
  });
  assert.equal(film.theme?.themeId, "avandar");
});

test("an empty draft patch on a built-in theme still renders as the unsaved theme", async () => {
  const film = await ShowcaseFilms.load({
    id: "stock-network-graph",
    rawOptions: {
      theme: { id: "avandar", patch: {} },
    },
  });
  assert.equal(film.theme?.themeId, DRAFT_THEME_ID);
});

async function _getContinuityThemeFilmFixtures(): Promise<
  Readonly<{
    original: Awaited<ReturnType<typeof ShowcaseFilms.load>>;
    film: Awaited<ReturnType<typeof ShowcaseFilms.load>>;
  }>
> {
  const original = await ShowcaseFilms.load({ id: "qetl-motion" });
  const film = await ShowcaseFilms.load({
    id: "qetl-motion",
    rawOptions: {
      theme: {
        id: "classic",
        patch: {
          other: { video: { atomic: { swatch: { ground: "#ffffff" } } } },
        },
      },
      cameraMotion: false,
      motionBlur: false,
      annotations: false,
    },
  });
  return { original, film };
}

async function _getCameraPresetFilmFixtures(): Promise<
  Readonly<{
    original: Awaited<ReturnType<typeof ShowcaseFilms.load>>;
    adjusted: Awaited<ReturnType<typeof ShowcaseFilms.load>>;
  }>
> {
  const original = await ShowcaseFilms.load({ id: "shared-object-handoff" });
  const adjusted = await ShowcaseFilms.load({
    id: "shared-object-handoff",
    rawOptions: {
      theme: {
        id: "classic",
        patch: {
          other: { video: { semantic: { camera: { preset: "deliberate" } } } },
        },
      },
    },
  });
  return { original, adjusted };
}
