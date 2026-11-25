import type { storyboardStructureSchema } from "../storyboardStructureSchema";
import type { z } from "zod";
/** The validated structure supplied to cross-field storyboard checks. */
export type StoryboardPlan = z.infer<typeof storyboardStructureSchema>;
/** One authored scene with its scene-specific payload. */
export type StoryboardShot = StoryboardPlan["shots"][number];
/** Reports one validation message in its authored check order. */
export type StoryboardIssue = (message: string) => void;
