import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { STOCK } from "../../stockPalette";
import { JigPattern } from "./JigPattern";
import type { Input } from "./SharedJigPreparation.schema";
import type { ReactNode } from "react";
type Props = {
  collaborator: Input["collaborators"][number];
  x: number;
  hasApplication: boolean;
  isAligned: boolean;
  input: Input;
  accent: string;
};
/** A retained existing workpiece receives one matching application. */
export function JigStation({
  collaborator,
  x,
  hasApplication,
  isAligned,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <PersonGlyph x={x} y={275} color={STOCK.cyan} />
      <LabelSlots
        labels={[
          [collaborator.label, x - 88, 200, 176, 18, 3],
          [collaborator.workpieceLabel, x - 100, 480, 200, 14, 3],
        ]}
      />
      <rect
        data-workpiece={collaborator.id}
        x={x - 70}
        y={330}
        width={140}
        height={112}
        rx={input.workpieceMaterial === "fabric" ? 16 : 2}
        fill={STOCK.surface}
        stroke={STOCK.line}
        strokeDasharray={
          input.workpieceMaterial === "fabric" ? "5 3" : undefined
        }
      />
      {hasApplication ? (
        <g data-application={collaborator.id}>
          <JigPattern
            x={x - 50}
            y={350}
            pattern={input.guide.pattern}
            color={accent}
          />
        </g>
      ) : undefined}
      {input.showAlignmentGuides && isAligned ? (
        <path
          data-alignment={collaborator.id}
          d={`M${x - 58} 342 h116 v80 h-116 Z`}
          stroke={STOCK.cyan}
          fill="none"
          strokeDasharray="4 4"
        />
      ) : undefined}
    </g>
  );
}
