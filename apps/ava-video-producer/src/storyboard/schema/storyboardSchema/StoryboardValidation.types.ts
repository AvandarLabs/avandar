import type { shotSchema } from "../shotSchema";
import type { z } from "zod";
/** The authored properties validated for tilted-window shots. */
export type TiltedWindowProps = Extract<
  z.infer<typeof shotSchema>,
  { scene: "tilted-window" }
>["props"];
