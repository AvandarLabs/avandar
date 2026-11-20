import { CaptionOverlay } from "../../scenes/CaptionOverlay";
import {
  absoluteCues,
  durationInFrames,
  timeline,
  type Storyboard,
} from "../schema/schema";
import type { ReactNode } from "react";
/** Shows the active storyboard caption for `FilmFrame` at a film frame. */
export function _FilmCaptions({
  plan,
  frame,
}: {
  plan: Storyboard;
  frame: number;
}): ReactNode {
  return (
    <CaptionOverlay
      frame={frame}
      cues={absoluteCues(plan)}
      width={plan.width}
      height={plan.height}
    />
  );
}
