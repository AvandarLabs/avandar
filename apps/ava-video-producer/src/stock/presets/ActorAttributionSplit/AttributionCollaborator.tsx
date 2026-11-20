import { propEq } from "@avandar/utils";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { STAMP_CORNER } from "./attributionShape";
import type { Input } from "./ActorAttributionSplit.schema";
import type { ReactNode } from "react";

type Props = {
  person: Input["collaborators"][number];
  index: number;
  input: Input;
  separation: number;
  accent: string;
};
/** A fictional actor retains its identity beside its assigned account stamp. */
export function AttributionCollaborator({
  person,
  index,
  input,
  separation,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const y = 170 + index * 160;
  const account = input.accounts.find(
    propEq("id", person.individualAccountId),
  )!;
  return (
    <g data-collaborator={person.id}>
      <SketchedShape
        shape={{ kind: "circle", cx: 85, cy: y, r: 18 }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={accent}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M65 ${y + 50} V${y + 30} Q85 ${y + 10} 105 ${y + 30} V${y + 50}`,
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <LabelSlots labels={[[person.label, 45, y + 67, 225, 12, 3]]} />
      <g opacity={separation} transform={`translate(300 ${y - 30})`}>
        <StockRect
          width={215}
          height={60}
          rx={scales.corner(STAMP_CORNER)}
          fill={tokens.color.surface}
          stroke={accent}
        />
        <LabelSlots labels={[[account.label, 12, 22, 190, 12, 3]]} />
      </g>
    </g>
  );
}
