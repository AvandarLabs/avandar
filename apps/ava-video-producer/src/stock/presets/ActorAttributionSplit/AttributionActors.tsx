import { propEq } from "@avandar/utils";
import { mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { AttributionCollaborator } from "./AttributionCollaborator";
import { STAMP_CORNER } from "./attributionShape";
import type { Input } from "./ActorAttributionSplit.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** Frames the shared stamp takes to drop away as accounts separate. */
const SEPARATION_FRAMES = 34;
/** Supplied collaborators, the retired shared stamp and distinct new stamps. */
export function AttributionActors({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const separation = ramp(
    frame,
    61,
    motion.scale(SEPARATION_FRAMES),
    motion.travel.easing,
  );
  const shared = input.accounts.find(propEq("id", input.sharedAccountId))!;
  return (
    <g>
      {input.collaborators.map((person, index) => {
        return (
          <AttributionCollaborator
            key={person.id}
            person={person}
            index={index}
            input={input}
            separation={separation}
            accent={accent}
          />
        );
      })}
      <g
        data-shared-stamp="true"
        transform={`translate(300 ${mix(separation, 245, 490)})`}
      >
        <StockRect
          width={215}
          height={60}
          rx={scales.corner(STAMP_CORNER)}
          fill={tokens.color.surface}
          stroke={tokens.color.inactive}
        />
        <LabelSlots labels={[[shared.label, 12, 22, 190, 12, 3]]} />
      </g>
    </g>
  );
}
