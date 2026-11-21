import { clsx } from "clsx";
import { ShotBoundary } from "../../ShotBoundary/ShotBoundary";
import css from "./ShotTransitionCard.module.css";
import type { ShotTransition } from "../../../../../../storyboard/schema/shotTransitionSchema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  item: { code: string; transition?: ShotTransition; frames: number };
};
/** Shows the two-shot handover and the authored transition label. */
export function ShotTransitionCard({
  frame,
  item,
}: Readonly<Props>): ReactNode {
  return (
    <div className={css.shotTransitionCardMiniStage}>
      <div
        className={clsx(
          css.shotTransitionCardMiniFrame,
          css.shotTransitionCardMiniFrameShort,
        )}
      >
        <ShotBoundary
          frame={frame}
          transition={item.transition}
          frames={item.frames}
        />
      </div>
      <span className={css.shotTransitionCardCaption}>{item.code}</span>
    </div>
  );
}
