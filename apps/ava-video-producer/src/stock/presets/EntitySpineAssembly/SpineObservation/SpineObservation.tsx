import { propEq } from "@avandar/utils";
import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ObservationCard } from "./ObservationCard";
import { type Props } from "./SpineObservationShared.types";
import type { ReactNode } from "react";
/**
 * Source identities stay readable while numeric contributions travel to a key.
 */
export function SpineObservation({
  input,
  observation,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const entityIndex = input.entities.findIndex(
      propEq("id", observation.entityId),
    ),
    sourceY = 104 + index * 60;
  const targetY = 164 + entityIndex * 100;
  return (
    <g data-observation-row={observation.id}>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M390 ${sourceY + 25} H420 V${targetY} H455`,
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.line}
        opacity={motion.reveal(frame, 49)}
      />
      <ObservationCard observation={observation} y={sourceY} />
      {frame < 49 || frame >= 139 ? (
        <LabelSlots
          labels={[[String(observation.value), 60, sourceY + 50, 320, 12, 1]]}
        />
      ) : null}
    </g>
  );
}
