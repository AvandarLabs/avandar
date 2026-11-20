import { DrawPath } from "../../graphics-common/DrawPath";
import { FitText } from "../../primitives/FitText/FitText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./RejectAndReplace.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** A stated criterion and unchanged selection slot explain the replacement. */
export function SelectionCriterion({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const { atomic } = useGraphicTheme();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const slot = {
    x: 312,
    y: 202,
    width: 336,
    height: 320,
    rx: scales.corner(22),
  };
  return (
    <g>
      <CriterionLabel criterion={input.criterion} frame={frame} />
      <StockRect
        {...slot}
        fill="none"
        stroke={tokens.color.line}
        strokeDasharray={atomic.dash.spaced.join(" ")}
        opacity={motion.ramp(frame, 18, motion.hero)}
      />
      {input.showCriterionLink ? (
        <CriterionLink frame={frame} accent={accent} />
      ) : null}
    </g>
  );
}

/** The link from the criterion to the replacement it selected. */
function CriterionLink({
  frame,
  accent,
}: Readonly<{ frame: number; accent: string }>): ReactNode {
  const motion = useGraphicMotion();
  return (
    <g data-criterion-link="replacement" opacity={motion.reveal(frame, 108)}>
      <DrawPath
        d="M480 145 V176 H674 V444 H624"
        frame={frame}
        at={108}
        duration={12}
        color={accent}
      />
    </g>
  );
}

/** The stated criterion, fading in above the selection slot. */
function CriterionLabel({
  criterion,
  frame,
}: Readonly<{ criterion: string; frame: number }>): ReactNode {
  const motion = useGraphicMotion();
  const label = {
    text: criterion,
    x: 480,
    y: 60,
    width: 840,
    fontSize: 24 as const,
    maxLines: 3,
  };
  return (
    <g opacity={motion.ramp(frame, 12, motion.hero)} aria-label={criterion}>
      <FitText {...label} breakLongWords normalizeWhitespace anchor="middle" />
    </g>
  );
}
