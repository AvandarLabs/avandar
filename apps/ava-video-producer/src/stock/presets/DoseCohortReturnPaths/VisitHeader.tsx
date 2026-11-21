import { Motion } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { SceneLabel } from "./SceneLabel";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const x = 380 + index * 155 + _getColumnShift({ frame, index, motion });
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
/** The column sliding in from the right onto its visit position. */
function _getColumnShift({
  frame,
  index,
  motion,
}: Readonly<{
  frame: number;
  index: number;
  motion: VideoMotion;
}>): number {
  return Motion.mix({
    t: motion.ramp(
      frame,
      24 + index * motion.scaleStagger(18),
      motion.scale(24),
      motion.travel.easing,
    ),
    from: 35,
    to: 0,
  });
}
