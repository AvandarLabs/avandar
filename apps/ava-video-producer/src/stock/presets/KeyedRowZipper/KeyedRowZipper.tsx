import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { JoinHeadings } from "./JoinHeadings";
import { JoinRow } from "./JoinRow";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./KeyedRowZipper.schema";
import type { ReactNode } from "react";
/** Frame, theme and complete validated authored input. */
export type Props = GraphicProps & { input: Input };
/** Source rows physically align and close around an exact shared key. */
export function KeyedRowZipper({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={ramp(frame, 12, 20)}>
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
      {input.leftRows.map((row, index) => (
        <JoinRow
          key={row.key}
          frame={frame}
          accent={accent}
          input={input}
          row={row}
          index={index}
          side="left"
        />
      ))}
      {input.rightRows.map((row, index) => (
        <JoinRow
          key={row.key}
          frame={frame}
          accent={accent}
          input={input}
          row={row}
          index={index}
          side="right"
        />
      ))}
    </g>
  );
}
