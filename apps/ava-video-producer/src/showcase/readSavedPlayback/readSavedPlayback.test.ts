import assert from "node:assert/strict";
import test from "node:test";
import { readSavedPlayback } from "./readSavedPlayback";

function _read(value: unknown) {
  return readSavedPlayback({
    storage: {
      getItem: () => {
        return JSON.stringify(value);
      },
    },
    key: "film:test",
  });
}

test("saved transport and caption choices survive a reload", () => {
  const playback = {
    frame: 42,
    playing: false,
    captions: true,
    speed: 0.5,
    loop: true,
  };
  assert.deepEqual(_read(playback), playback);
});

test("missing and unreadable saved playback is ignored", () => {
  assert.equal(
    readSavedPlayback({
      storage: {
        getItem: () => {
          return null;
        },
      },
      key: "film:test",
    }),
    undefined,
  );
  assert.equal(
    readSavedPlayback({
      storage: {
        getItem: () => {
          return "{";
        },
      },
      key: "film:test",
    }),
    undefined,
  );
});

test("saved playback with invalid transport or caption fields is ignored", () => {
  Array.from([
    false,
    [],
    {},
    { frame: "42", playing: true, captions: true },
    { frame: 42, playing: "yes", captions: true },
    { frame: 42, playing: true, captions: 1 },
    { frame: 42, playing: true, captions: true, speed: "fast" },
    { frame: 42, playing: true, captions: true, loop: 1 },
  ]).forEach((value) => {
    assert.equal(_read(value), undefined, JSON.stringify(value));
  });
});
