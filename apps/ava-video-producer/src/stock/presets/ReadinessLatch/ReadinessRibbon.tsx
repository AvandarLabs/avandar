import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getReadinessRibbonGeometry } from "./getReadinessRibbonGeometry";
import { ReadinessRibbonLabels } from "./ReadinessRibbonLabels";
import type { Input } from "./ReadinessLatch.schema";
import type { ReactNode } from "react";

type Props = {
  participant: Input["participants"][number];
  index: number;
  numParticipants: number;
  maxWork: number;
  frame: number;
  input: Input;
  accent: string;
};
/** The retractable pin's line weight, before the theme's line weight scale. */
const PIN_WIDTH = 6;
/** A stable branch owns one progressing ribbon and one retractable pin. */
export function ReadinessRibbon({
  participant,
  index,
  numParticipants,
  maxWork,
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const horizontal = input.orientation === "horizontal";
  const position = (index * 280) / (numParticipants - 1);
  const x = horizontal ? 300 : 300 + (index * 584) / (numParticipants - 1);
  const y = horizontal ? 135 + position : 300;
  const duration = (88 * participant.workUnits) / maxWork;
  const progress =
    motion.ramp(frame, 24, duration, motion.travel.easing) *
    (participant.ready ? 1 : 0.72);
  const withdrawal = participant.ready
    ? motion.ramp(frame, 24 + duration, motion.whip)
    : 0;
  const state =
    participant.ready && frame >= 24 + duration
      ? input.copy.ready
      : input.copy.waiting;
  const { track, ribbon, pin } = getReadinessRibbonGeometry({
    horizontal,
    x,
    y,
    progress,
    withdrawal,
  });
  const labels = { participant, input, state, horizontal, x, y };
  return (
    <g
      opacity={motion.ramp(
        frame,
        12 + index * motion.stagger.list,
        motion.scale(10),
      )}
    >
      <rect
        {...track}
        rx={scales.corner(tokens.corner.chip)}
        fill={tokens.color.line}
      />
      <rect
        data-ribbon={participant.id}
        {...ribbon}
        rx={scales.corner(tokens.corner.chip)}
        fill={accent}
      />
      <SketchedShape
        data-pin={participant.id}
        shape={{ kind: "line", ...pin }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(PIN_WIDTH)}
        strokeLinecap="round"
      />
      {input.showLabels ? <ReadinessRibbonLabels {...labels} /> : undefined}
    </g>
  );
}
