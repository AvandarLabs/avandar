import { Motion } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { JoinRow } from "./JoinRow";
import { JoinTitleAndLeftRows } from "./JoinTitleAndLeftRows";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./KeyedRowZipper.schema";
import type { ReactNode } from "react";

/** Frame, theme and complete validated authored input. */
export type Props = GraphicProps & {
  input: Input;
};

/** Frames the whole join takes to fade in. */
const INTRO_FRAMES = 20;

/** Source rows physically align and close around an exact shared key. */
export function KeyedRowZipper({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g
      opacity={Motion.ramp({
        frame,
        at: 12,
        dur: motion.scale(INTRO_FRAMES),
        easing: motion.reveal.easing,
      })}
    >
      <JoinTitleAndLeftRows frame={frame} accent={accent} input={input} />
      {input.rightRows.map((row, index) => {
        return (
          <JoinRow
            key={row.key}
            frame={frame}
            accent={accent}
            input={input}
            row={row}
            index={index}
            side="right"
          />
        );
      })}
    </g>
  );
}
