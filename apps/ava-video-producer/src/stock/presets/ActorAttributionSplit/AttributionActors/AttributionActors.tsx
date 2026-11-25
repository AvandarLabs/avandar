import { propEq } from "@avandar/utils";
import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { AttributionCollaborator } from "../AttributionCollaborator";
import { AttributionActorsSharedStamp } from "./AttributionActorsSharedStamp";
import type { Input } from "../ActorAttributionSplit.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  input: Input;
  accent: string;
};

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
  const separation = Motion.ramp({
    frame,
    at: 61,
    dur: motion.scale(SEPARATION_FRAMES),
    easing: motion.travel.easing,
  });
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
      <AttributionActorsSharedStamp
        tokens={tokens}
        scales={scales}
        separation={separation}
        shared={shared}
      />
    </g>
  );
}
