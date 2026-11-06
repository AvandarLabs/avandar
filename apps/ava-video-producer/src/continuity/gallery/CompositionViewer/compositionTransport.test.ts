import assert from "node:assert/strict";
import test from "node:test";
import { getCompositionTransportUpdates } from "./compositionTransport";

test("new film defaults receive the current controlled speed and loop", () => {
  assert.deepEqual(
    getCompositionTransportUpdates(
      { speed: 2, loop: true },
      { speed: 1, loop: false },
    ),
    [
      { action: "speed", value: 2 },
      { action: "loop", value: true },
    ],
  );
});
test("reloaded playback is synchronized without redundant updates", () => {
  assert.deepEqual(
    getCompositionTransportUpdates(
      { speed: 1, loop: false },
      { speed: 2, loop: true },
    ),
    [
      { action: "speed", value: 1 },
      { action: "loop", value: false },
    ],
  );
  assert.deepEqual(
    getCompositionTransportUpdates(
      { speed: 2, loop: true },
      { speed: 2, loop: true },
    ),
    [],
  );
});
