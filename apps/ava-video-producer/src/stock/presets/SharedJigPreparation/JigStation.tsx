import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const tokens = useGraphicTokens();
  return (
    <g>
      <PersonGlyph x={x} y={275} color={tokens.color.accentAlt} />
      <LabelSlots
        labels={[
          [collaborator.label, x - 88, 200, 176, 18, 3],
          [collaborator.workpieceLabel, x - 100, 480, 200, 14, 3],
        ]}
      />
      <StockRect
        data-workpiece={collaborator.id}
        x={x - 70}
        y={330}
        width={140}
        height={112}
        rx={input.workpieceMaterial === "fabric" ? 16 : 2}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
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
        <SketchedShape
          shape={{ kind: "path", d: `M${x - 58} 342 h116 v80 h-116 Z` }}
          profile={tokens.sketch.shape}
          data-alignment={collaborator.id}
          stroke={tokens.color.accentAlt}
          fill="none"
          strokeDasharray={tokens.dash.pending.join(" ")}
        />
      ) : undefined}
    </g>
  );
}
