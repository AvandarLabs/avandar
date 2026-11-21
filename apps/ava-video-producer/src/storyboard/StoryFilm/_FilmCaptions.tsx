import { CaptionOverlay } from "../../scenes/CaptionOverlay";
import { type Storyboard } from "../schema/schema";
import { StoryboardTimeline } from "../schema/StoryboardTimeline";
import type { ReactNode } from "react";

type Props = {
  plan: Storyboard;
  frame: number;
};

/** Shows the active storyboard caption for `FilmFrame` at a film frame. */
export function _FilmCaptions({ plan, frame }: Readonly<Props>): ReactNode {
  return (
    <CaptionOverlay
      frame={frame}
      cues={StoryboardTimeline.absoluteCues(plan)}
      width={plan.width}
      height={plan.height}
    />
  );
}
