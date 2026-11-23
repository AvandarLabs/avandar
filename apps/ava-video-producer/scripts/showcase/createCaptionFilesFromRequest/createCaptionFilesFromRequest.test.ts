import assert from "node:assert/strict";
import test from "node:test";
import { ContinuityThemePlans } from "../../../src/continuity/ContinuityThemePlans/ContinuityThemePlans";
import { DRAFT_THEME_ID } from "../../../src/videoTheme/makeDraftThemeTargetFromLibrary/makeDraftThemeTargetFromLibrary";
import { makeCaptionFilesFromPlan } from "../../lib/planHelpers/makeCaptionFilesFromPlan";
import { makeCaptionFilesFromRequest } from "../makeCaptionFilesFromRequest/makeCaptionFilesFromRequest";
import { ShowcaseFilms } from "../ShowcaseFilms/ShowcaseFilms";

const FILM_ID = "shared-object-handoff";
function _deliberateTheme(speed?: number) {
  return {
    id: "classic",
    patch: {
      other: {
        video: {
          ...(speed === undefined
            ? {}
            : { atomic: { cameraSpeed: { deliberate: speed } } }),
          semantic: { camera: { preset: "deliberate" } },
        },
      },
    },
  };
}
async function _captions(options: Readonly<Record<string, unknown>>) {
  const result = await makeCaptionFilesFromRequest({
    id: FILM_ID,
    options,
    load: ShowcaseFilms.load,
  });
  if (result.status !== 200) {
    throw new Error(`Expected captions, got ${result.status}`);
  }
  return result;
}
test("a draft that changes a camera preset's speed reaches the captions and matches the export", async () => {
  const options = { theme: _deliberateTheme(0.1) };
  const captions = await _captions(options);
  const exported = await ShowcaseFilms.load({
    id: FILM_ID,
    rawOptions: options,
  });
  const exportFiles = makeCaptionFilesFromPlan(
    ContinuityThemePlans.fromVideoThemeSnapshot({
      plan: exported.plan!,
      snapshot: exported.theme,
      overrideIds: [FILM_ID],
    }),
  );
  assert.equal(captions.files.srt, exportFiles.srt);
  assert.notEqual(
    captions.files.srt,
    (await _captions({ theme: _deliberateTheme() })).files.srt,
  );
});
test("a request with no draft resolves the saved built-in theme, overrides included", async () => {
  const captions = await _captions({ theme: { id: "classic" } });
  assert.equal(captions.film.theme?.themeId, "classic");
  assert.equal(captions.files.srt, (await _captions({})).files.srt);
});
test("an empty patch is a draft", async () => {
  const captions = await _captions({ theme: { id: "classic", patch: {} } });
  assert.equal(captions.film.theme?.themeId, DRAFT_THEME_ID);
});
test("bad options for a known film are a request error", async () => {
  const result = await makeCaptionFilesFromRequest({
    id: FILM_ID,
    options: { theme: { id: "missing" } },
    load: ShowcaseFilms.load,
  });
  assert.deepEqual(result, { status: 400 });
});
test("an unknown film is not found", async () => {
  const result = await makeCaptionFilesFromRequest({
    id: "missing-film",
    options: {},
    load: ShowcaseFilms.load,
  });
  assert.deepEqual(result, { status: 404 });
});
test("a film without a plan has no captions", async () => {
  const result = await makeCaptionFilesFromRequest({
    id: "stock-network-graph",
    options: {},
    load: ShowcaseFilms.load,
  });
  assert.deepEqual(result, { status: 404 });
});
