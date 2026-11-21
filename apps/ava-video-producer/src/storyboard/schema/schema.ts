import { StoryboardTimeline } from "./StoryboardTimeline";

export { assetPathSchema } from "./primitives";
export { shotSchema } from "./shotSchema";
export type { Shot, Storyboard } from "./storyboardSchema/storyboardSchema";
export { storyboardSchema } from "./storyboardSchema/storyboardSchema";
export { StoryboardTimeline };
/** Documented timing API available to authored film compositions. */
export const absoluteCues = StoryboardTimeline.absoluteCues;
/** Documented timing API available to authored film compositions. */
export const declaredCutFrames = StoryboardTimeline.declaredCutFrames;
/** Documented timing API available to authored film compositions. */
export const durationInFrames = StoryboardTimeline.durationInFrames;
/** Documented timing API available to authored film compositions. */
export const timeline = StoryboardTimeline.timeline;
