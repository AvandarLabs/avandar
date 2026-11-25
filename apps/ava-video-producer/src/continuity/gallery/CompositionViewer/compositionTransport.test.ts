import assert from "node:assert/strict";
import test from "node:test";
import { getCompositionTransportUpdates } from "./getCompositionTransportUpdates";

test("new film defaults receive the current controlled speed and loop", () => {
  assert.deepEqual(
    getCompositionTransportUpdates({
      desired: { speed: 2, loop: true },
      actual: { speed: 1, loop: false },
    }),
    [
      { action: "speed", value: 2 },
      { action: "loop", value: true },
    ],
  );
});
test("reloaded playback is synchronized without redundant updates", () => {
  assert.deepEqual(
    getCompositionTransportUpdates({
      desired: { speed: 1, loop: false },
      actual: { speed: 2, loop: true },
    }),
    [
      { action: "speed", value: 1 },
      { action: "loop", value: false },
    ],
  );
  assert.deepEqual(
    getCompositionTransportUpdates({
      desired: { speed: 2, loop: true },
      actual: { speed: 2, loop: true },
    }),
    [],
  );
});
