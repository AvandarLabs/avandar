import { ramp } from "../../../motion";
import { QueueItem } from "./QueueItem";
import { QueueStructure } from "./QueueStructure";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./QueueRelief.schema";
import type { ReactNode } from "react";
/** Frame, theme and complete validated authored input. */
export type Props = GraphicProps & { input: Input };
/** A conserved backlog clears only after the supplied extra bays open. */
export function QueueRelief({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={ramp(frame, 0, 12)}>
      <QueueStructure frame={frame} input={input} accent={accent} />
      {input.items.map((item, index) => (
        <QueueItem
          key={item.id}
          frame={frame}
          input={input}
          item={item}
          index={index}
          accent={accent}
        />
      ))}
    </g>
  );
}
