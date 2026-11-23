import { SceneTransitionKind } from "../../../../../motion-components/getSceneTransitionStyle";

const SCENE_KINDS: SceneTransitionKind[] = [
  "dissolve",
  "wipe",
  "aperture",
  "spatial",
  "morph",
];
const STAGE = { width: 160, height: 110 };
/** Defines the transition variants and miniature stage used for comparison. */
export const TransitionDemosShared = {
  /** Transition variants displayed together for visual comparison. */
  SCENE_KINDS,
  /** Pixel dimensions shared by the miniature transition previews. */
  STAGE,
} as const;
