import assert from "node:assert/strict";
import test from "node:test";
import { getSceneTransitionStyle } from "../getSceneTransitionStyle";
import { makeSceneTransitionSpecFromProps } from "../makeSceneTransitionSpecFromProps";

test("scene factory applies duration and easing to the same transition", () => {
  const transition = makeSceneTransitionSpecFromProps({
    input: {
      kind: "spatial",
      durationInFrames: 24,
      motion: { speed: 0.5, easing: "linear" },
    },
  });
  assert.equal(transition.timing.getDurationInFrames({ fps: 30 }), 48);
  assert.equal(transition.timing.getProgress({ frame: 12, fps: 30 }), 0.25);
  assert.throws(() => {
    return makeSceneTransitionSpecFromProps({
      input: { kind: "cut", durationInFrames: 0 },
    });
  }, /Cuts/);
});

test("native UI scene movement has bounded blur, exact rests and an opaque outgoing dissolve", () => {
  const props = {
    kind: "spatial" as const,
    width: 800,
    height: 450,
    motion: { preset: "gentle" as const },
  };
  assert.equal(
    getSceneTransitionStyle({ progress: 0, entering: true, props }).transform,
    "translateX(800px)",
  );
  assert.equal(
    getSceneTransitionStyle({ progress: 0.5, entering: true, props }).filter,
    "blur(6px)",
  );
  assert.equal(
    getSceneTransitionStyle({ progress: 1, entering: true, props }).transform,
    "translateX(0px)",
  );
  assert.equal(
    getSceneTransitionStyle({
      progress: 0.5,
      entering: true,
      props: { ...props, motionBlur: false },
    }).filter,
    undefined,
  );
  _assertNonSpatialTransitionStyles({ props });
});

test("a spatial transition's peak blur comes from the motion options", () => {
  const style = getSceneTransitionStyle({
    progress: 0.5,
    entering: true,
    props: { kind: "spatial", motion: { transitionBlur: 24 } },
  });
  assert.equal(style.filter, "blur(24px)");
});

test("a morph starts from its themed radius and an aperture opens to its themed overscan", () => {
  const morph = getSceneTransitionStyle({
    progress: 0.5,
    entering: true,
    props: { kind: "morph", morphRadius: 24 },
  });
  assert.match(String(morph.clipPath), /round 12px\)$/);
  const aperture = getSceneTransitionStyle({
    progress: 1,
    entering: true,
    props: { kind: "aperture", apertureOverscan: 1 },
  });
  assert.equal(
    aperture.clipPath,
    `circle(${Math.hypot(1600, 840)}px at 800px 420px)`,
  );
});

function _assertNonSpatialTransitionStyles({
  props,
}: Readonly<{
  props: Parameters<typeof getSceneTransitionStyle>[0]["props"];
}>): void {
  assert.equal(
    getSceneTransitionStyle({
      progress: 0.5,
      entering: false,
      props: { kind: "dissolve" },
    }).opacity,
    1,
  );
  assert.equal(
    getSceneTransitionStyle({
      progress: 0.5,
      entering: true,
      props: { kind: "dissolve" },
    }).opacity,
    0.5,
  );
  assert.equal(
    getSceneTransitionStyle({
      progress: 0.5,
      entering: true,
      props: { ...props, cameraMotion: false },
    }).transform,
    undefined,
  );
}
