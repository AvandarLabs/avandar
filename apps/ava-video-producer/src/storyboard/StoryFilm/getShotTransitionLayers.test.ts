import assert from "node:assert/strict";
import test from "node:test";
import { getShotTransitionLayers } from "./getShotTransitionLayers";

const base = {
  transitionInFrames: 8,
  previousDurationInFrames: 120,
  width: 1920,
};

test("a shot with no previous shot renders alone and unstyled", () => {
  const layers = getShotTransitionLayers({
    ...base,
    previousDurationInFrames: undefined,
    localFrame: 2,
  });
  assert.equal(layers.outgoing, undefined);
  assert.deepEqual(layers.incoming, {});
});

test("a shot without a transition kind dissolves over the frozen last frame", () => {
  const layers = getShotTransitionLayers({ ...base, localFrame: 4 });
  assert.equal(layers.outgoing?.frame, 119);
  const opacity = Number(layers.incoming.opacity);
  assert.ok(opacity > 0 && opacity < 1);
});

test("a playing outgoing shot keeps advancing past its own end", () => {
  const at = (localFrame: number) =>
    getShotTransitionLayers({
      ...base,
      localFrame,
      transition: { kind: "dissolve", outgoing: "playing" },
    }).outgoing?.frame;
  assert.equal(at(0), 120);
  assert.equal(at(5), 125);
});

test("the outgoing shot is gone once the transition has finished", () => {
  const layers = getShotTransitionLayers({ ...base, localFrame: 8 });
  assert.equal(layers.outgoing, undefined);
  assert.deepEqual(layers.incoming, {});
});

test("a hard cut never shows the outgoing shot", () => {
  const layers = getShotTransitionLayers({
    ...base,
    transitionInFrames: 0,
    localFrame: 0,
  });
  assert.equal(layers.outgoing, undefined);
});

test("a declared cut never shows the outgoing shot", () => {
  const layers = getShotTransitionLayers({
    ...base,
    transitionInFrames: 0,
    localFrame: 0,
    transition: { kind: "cut" },
  });
  assert.equal(layers.outgoing, undefined);
  assert.deepEqual(layers.incoming, {});
});

test("a column wipe clips the incoming shot and drifts the outgoing one further over time", () => {
  const at = (localFrame: number) =>
    getShotTransitionLayers({
      ...base,
      localFrame,
      transition: {
        kind: "stepped-column-wipe",
        outgoingDrift: { x: -0.06, blur: 12 },
      },
    });
  assert.match(String(at(3).incoming.clipPath), /^polygon/);
  assert.equal(at(3).incoming.opacity, undefined);
  assert.ok(at(6).outgoing!.offsetX < at(2).outgoing!.offsetX);
  assert.ok(at(6).outgoing!.offsetX >= -0.06 * 1920);
  assert.ok(at(6).outgoing!.blurX > at(2).outgoing!.blurX);
});
