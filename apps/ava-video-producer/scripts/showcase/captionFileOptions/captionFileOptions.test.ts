import assert from "node:assert/strict";
import test from "node:test";
import {
  getCaptionFileOptionsFromSearch,
  loadCaptionFilm,
} from "./captionFileOptions";

test("a theme and camera preset become a theme option for caption timing", () => {
  assert.deepEqual(
    getCaptionFileOptionsFromSearch(
      new URLSearchParams("theme=classic&cameraPreset=whip&cameraMotion=true"),
    ),
    {
      theme: {
        id: "classic",
        patch: {
          other: { video: { semantic: { camera: { preset: "whip" } } } },
        },
      },
      cameraMotion: true,
    },
  );
});

test("without a theme the film keeps its own and only camera motion applies", () => {
  assert.deepEqual(
    getCaptionFileOptionsFromSearch(new URLSearchParams("cameraMotion=false")),
    { cameraMotion: false },
  );
});

const FILM = { id: "shared-object-handoff" };

async function _loadOnlyWithoutOptions(id: string, options: object) {
  if (id !== FILM.id || Object.keys(options).length > 0) {
    throw new Error("internal detail");
  }
  return FILM;
}

test("a bad caption query for a known film is a request error", async () => {
  assert.deepEqual(
    await loadCaptionFilm({
      id: FILM.id,
      parameters: new URLSearchParams("theme=missing"),
      load: _loadOnlyWithoutOptions,
    }),
    { status: 400 },
  );
});

test("an unknown film is not found", async () => {
  assert.deepEqual(
    await loadCaptionFilm({
      id: "missing-film",
      parameters: new URLSearchParams(),
      load: _loadOnlyWithoutOptions,
    }),
    { status: 404 },
  );
});

test("a valid caption query loads the film", async () => {
  assert.deepEqual(
    await loadCaptionFilm({
      id: FILM.id,
      parameters: new URLSearchParams(),
      load: _loadOnlyWithoutOptions,
    }),
    { status: 200, film: FILM },
  );
});
