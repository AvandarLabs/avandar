import { STOCK } from "../../stockPalette";
import { LunchLabels } from "./LunchLabels";
import { LunchTray } from "./LunchTray";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./SchoolLunchTrayComposition.schema";
import type { ReactNode } from "react";
/** Inputs for SchoolLunchTrayComposition. */
type Props = GraphicProps & { input: Input };

/** Serving preserves every planned tray without scoring the learners. */
export function SchoolLunchTrayComposition({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <rect
        x={30}
        y={208}
        width={900}
        height={304}
        rx={20}
        fill={STOCK.surface}
        fillOpacity={0.35}
        stroke={STOCK.line}
      />
      <LunchLabels input={input} accent={accent} frame={frame} />
      {input.learners.map((learner, index) => (
        <LunchTray
          key={learner.id}
          input={input}
          index={index}
          frame={frame}
          accent={accent}
        />
      ))}
    </g>
  );
}
