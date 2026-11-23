import { Motion } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ConflictCandidate } from "./ConflictCandidate";
import { ConflictChoiceMark } from "./ConflictChoiceMark/ConflictChoiceMark";
import { ConflictFieldHeading } from "./ConflictFieldHeading";
import type { Input } from "./FieldConflictChoice.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  accent: string;
  input: Input;
  field: Input["fields"][number];
  index: number;
};
/** Frames the candidates take to lift into their result lanes. */
const CHOOSE_FRAMES = 70;
/**
 * A field keeps the chosen result and its unresolved or rejected alternatives.
 */
export function ConflictField({
  frame,
  accent,
  input,
  field,
  index,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const y = 106 + index * 122;
  const progress = Motion.ramp({
    frame,
    at: 42,
    dur: motion.scale(CHOOSE_FRAMES),
    easing: motion.travel.easing,
  });
  const lane = { field, input, y, progress };
  return (
    <g>
      <ConflictFieldHeading {...lane} />
      <ConflictChoiceMark {...lane} accent={accent} />
      {input.sources.map((source, sourceIndex) => {
        return (
          <ConflictCandidate
            key={source.id}
            {...lane}
            source={source}
            sourceIndex={sourceIndex}
            accent={accent}
          />
        );
      })}
    </g>
  );
}
