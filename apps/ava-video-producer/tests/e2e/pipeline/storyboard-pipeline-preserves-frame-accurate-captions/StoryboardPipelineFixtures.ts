import type { storyboardSchema } from "../../../../src/storyboard/schema/schema";
import type { z } from "zod";
/** Storyboard input before schema defaults are applied. */
export type StoryboardInput = z.input<typeof storyboardSchema>;
function _makePlan(): StoryboardInput {
  return {
    version: 1,
    id: "test-film",
    title: "Test",
    description: "A fixture",
    sourceNotes: ["Synthetic test"],
    purpose: "standalone",
    fps: 30,
    width: 1600,
    height: 1000,
    delivery: { width: 1536, height: 960 },
    shots: [
      {
        id: "opening",
        scene: "title",
        durationInFrames: 66,
        props: { name: "Test film", kicker: "One source" },
      },
      {
        id: "metric",
        scene: "metric",
        durationInFrames: 150,
        props: { label: "Records", value: 240 },
      },
    ],
    narration: [
      {
        id: "records",
        shotId: "metric",
        startFrame: 0,
        endFrame: 90,
        text: "Two hundred forty records.",
      },
    ],
  };
}

/** Mutable storyboard inputs and media shared by pipeline contract cases. */
export const StoryboardPipelineFixtures = {
  /** Returns a fresh mutable plan for validation scenarios. */
  makePlan: _makePlan,
  /** Returns a fresh plan containing the supplied shot. */
  makePlanFromShot: (
    shot: Readonly<StoryboardInput["shots"][number]>,
  ): StoryboardInput => {
    const plan = _makePlan();
    plan.shots[1] = shot;
    return plan;
  },
  /** Screen SVG fixture used by storyboard pipeline browser tests. */
  screen: { kind: "image" as const, src: "avandar/screens/map-map-cases.png" },
};
