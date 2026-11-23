import { z } from "zod";
import { shotSchema } from "../shotSchema";
/** The authored properties validated for tilted-window shots. */
export type TiltedWindowProps = Extract<
  z.infer<typeof shotSchema>,
  { scene: "tilted-window" }
>["props"];
