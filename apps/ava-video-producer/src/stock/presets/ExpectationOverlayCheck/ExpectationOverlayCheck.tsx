import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { ExpectationStation } from "./ExpectationStation";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./ExpectationOverlayCheck.schema";
import type { ReactNode } from "react";
/** Frame-driven expected/observed string comparison. */
export type Props = GraphicProps & { input: Input };
/** Registers exact expectations while missing observations stay unjudged. */
export function ExpectationOverlayCheck({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <LabelSlots labels={[[input.exampleLabel, 45, 50, 870, 16, 2]]} />
      {input.tests.map((item, index) => (
        <ExpectationStation
          key={item.id}
          item={item}
          index={index}
          frame={frame}
          input={input}
          accent={accent}
        />
      ))}
    </g>
  );
}
