import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
import { JoinHeadings } from "./JoinHeadings";
import { JoinRow } from "./JoinRow";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./KeyedRowZipper.schema";
import type { ReactNode } from "react";
/** Frame, theme and complete validated authored input. */
export type Props = GraphicProps & { input: Input };

/** Frames the whole join takes to fade in. */
const INTRO_FRAMES = 20;

/** Source rows physically align and close around an exact shared key. */
export function KeyedRowZipper({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  return (
    <g
      opacity={ramp(
        frame,
        12,
        motion.scale(INTRO_FRAMES),
        motion.reveal.easing,
      )}
    >
      <FitText
        text={input.labels.title}
        x={44}
        y={52}
        width={872}
        fontSize={24}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      <JoinHeadings frame={frame} input={input} />
      {input.leftRows.map((row, index) => {
        return (
          <JoinRow
            key={row.key}
            frame={frame}
            accent={accent}
            input={input}
            row={row}
            index={index}
            side="left"
          />
        );
      })}
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
