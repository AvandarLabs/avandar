import assert from "node:assert/strict";
import test from "node:test";
import { getCaptionFileOptionsFromSearch } from "./captionFileOptions";

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
