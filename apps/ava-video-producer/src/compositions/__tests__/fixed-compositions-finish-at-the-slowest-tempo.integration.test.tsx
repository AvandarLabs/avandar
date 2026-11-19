/** @jsxRuntime automatic */
/*
 * At the slowest tempo (0.8) the fixed compositions still finish every
 * one-shot animation before they loop: the last frame of `Demo`,
 * `MotionLab`, and `TitleStudy` looks the same at tempo 0.8 as at tempo 1.
 * Tempo stretches animation lengths, never cue frames, so a picture that
 * still moves at the last frame would differ. The shared title card fades
 * out onto its last frame by design, so it is checked on the frame it
 * unmounts on instead: by then its fade has ended at either tempo.
 * The stock and continuity side of this guard is
 * `scripts/videoTheme/__tests__/animations-finish-at-the-slowest-tempo`.
 */
import "../../../tests/helpers/registerRemotionTestHooks";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { VideoThemeProvider } from "../../videoTheme/VideoThemeProvider/VideoThemeProvider";
import { createStarterVideoThemeSource } from "../StarterVideoTheme/createStarterVideoThemeSource";
import type { VideoThemePatch } from "../../videoTheme/videoTheme.types";
import type { ReactNode } from "react";

// Loaded after the hooks register, since static imports load before any
// module runs.
const { MOTION_LAB_LEN, TITLE_LEN, TITLE_STUDY_LEN } =
  await import("../../composition-timing");
const { DEMO_LEN } = await import("../Demo/timeline");
const { Demo } = await import("../Demo/Demo");
const { MotionLab } = await import("../MotionLab");
const { TitleStudy } = await import("../TitleStudy");
const { TitleCard } = await import("../../title-card");

const SLOWEST_TEMPO: VideoThemePatch = {
  other: { video: { atomic: { tempo: { md: 0.8 } } } },
};

const COMPOSITIONS: ReadonlyArray<
  Readonly<{ id: string; element: ReactNode; frames: number }>
> = [
  { id: "demo", element: <Demo />, frames: DEMO_LEN },
  { id: "motion-lab", element: <MotionLab />, frames: MOTION_LAB_LEN },
  { id: "title-study", element: <TitleStudy />, frames: TITLE_STUDY_LEN },
  {
    id: "title-card",
    element: <TitleCard name="Name" kicker="Kicker" frame={TITLE_LEN} />,
    frames: TITLE_LEN + 1,
  },
];

function _renderAt(
  composition: (typeof COMPOSITIONS)[number],
  frame: number,
  isSlowest: boolean,
): string {
  (globalThis as { __testFrame?: number }).__testFrame = frame;
  const source = createStarterVideoThemeSource(composition.id);
  return renderToStaticMarkup(
    <VideoThemeProvider
      source={{
        ...source,
        scope: { ...source.scope, patches: isSlowest ? [SLOWEST_TEMPO] : [] },
      }}
    >
      {composition.element}
    </VideoThemeProvider>,
  );
}

function _renderLastFrame(
  composition: (typeof COMPOSITIONS)[number],
  isSlowest: boolean,
): string {
  return _renderAt(composition, composition.frames - 1, isSlowest);
}

test("the slowest tempo changes a frame mid-animation, so the check bites", () => {
  const [demo] = COMPOSITIONS;
  assert.notEqual(_renderAt(demo, 20, true), _renderAt(demo, 20, false));
});

test("every fixed composition finishes its animations before it loops", () => {
  assert.deepEqual(
    COMPOSITIONS.filter((composition) => {
      return (
        _renderLastFrame(composition, true) !==
        _renderLastFrame(composition, false)
      );
    }).map(({ id }) => {
      return id;
    }),
    [],
  );
});
