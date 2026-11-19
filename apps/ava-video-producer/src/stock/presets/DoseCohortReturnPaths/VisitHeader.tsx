import { mix } from "../../../motion";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./DoseCohortReturnPaths.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  visit: Input["visits"][number];
  index: number;
  frame: number;
  accent: string;
};
/** Visit captions and numerators remain attached to their moving column. */
export function VisitHeader({
  input,
  visit,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const x =
    380 +
    index * 155 +
    mix(
      motion.ramp(
        frame,
        24 + index * motion.scaleStagger(18),
        motion.scale(24),
        motion.travel.easing,
      ),
      35,
      0,
    );
  return (
    <g
      data-visit={visit.id}
      data-denominator={input.participants.length}
      opacity={motion.reveal(frame, 12 + index * motion.scaleStagger(2))}
    >
      <SceneLabel text={visit.label} x={x - 75} y={100} width={140} lines={3} />
      {input.showFractions ? (
        <text
          data-fraction={visit.id}
          x={x}
          y={150}
          fontFamily={tokens.text.graphic.secondary.fontFamily}
          fontWeight={tokens.text.graphic.secondary.fontWeight}
          fontSize={tokens.text.graphic.secondary.fontSize}
          fill={accent}
          textAnchor="middle"
        >
          {
            input.participants.filter((person) => {
              return person.records.some((record) => {
                return (
                  record.visitId === visit.id && record.state === "recorded"
                );
              });
            }).length
          }
          /{input.participants.length}
        </text>
      ) : undefined}
    </g>
  );
}
