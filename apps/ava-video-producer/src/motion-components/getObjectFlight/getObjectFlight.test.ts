import assert from "node:assert/strict";
import test from "node:test";
import { getObjectFlight } from "./getObjectFlight";

test("isolated objects use resolved departure timing with no residual motion after exit", () => {
  const flight = {
    at: 60,
    duration: 24,
    dx: 400,
    dy: -100,
    rect: { x: 0, y: 0, width: 100, height: 100 },
    motion: { speed: 0.5, easing: "linear" as const },
  };
  assert.deepEqual(getObjectFlight({ flight, frame: 59 }), {
    x: 0,
    y: 0,
    opacity: 1,
    active: false,
  });
  assert.deepEqual(getObjectFlight({ flight, frame: 84 }), {
    x: 200,
    y: -50,
    opacity: 1,
    active: true,
  });
  assert.deepEqual(getObjectFlight({ flight, frame: 108 }), {
    x: 400,
    y: -100,
    opacity: 0,
    active: false,
  });
});
