import assert from "node:assert/strict";
import test from "node:test";
import { measuredPath } from "../src/avandar/choreography";

test("measured cursor paths hold every destination from the click through click plus eight", () => {
  const beats = [
    { frame: 88, x: 420, y: 150, action: "click" },
    { frame: 104, x: 625, y: 175, action: "click" },
    { frame: 280, x: 1200, y: 340, action: "click" },
  ];
  const keys = measuredPath(beats);
  keys.forEach((key, index) => {
    if (index)
      assert.ok(key.at >= keys[index - 1].at, "Keys must be chronological");
  });
  for (const beat of beats) {
    const arrival = keys.filter((key) => key.at <= beat.frame).at(-1)!;
    assert.deepEqual({ x: arrival.x, y: arrival.y }, { x: beat.x, y: beat.y });
    const hold = keys.filter(
      (key) => key.at >= beat.frame && key.at <= beat.frame + 8,
    );
    assert.ok(
      hold.some((key) => key.at === beat.frame + 8),
      "The full click hold needs an explicit key",
    );
    assert.ok(
      hold.every((key) => key.x === beat.x && key.y === beat.y),
      "The next destination cannot begin during the click hold",
    );
  }
  assert.throws(
    () => measuredPath([beats[0], { ...beats[1], frame: 92 }]),
    /overlap/,
  );
});
