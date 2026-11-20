import { ramp } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = {
  batchId: string;
  isComplete: boolean;
  x: number;
  y: number;
  width: number;
  frame: number;
  completeAt: number;
  accent: string;
};

/** The faint wash inside an envelope before the tint strength scales it. */
const ENVELOPE_WASH = 0.035;
/** Frames the seal takes to close, ending as the batch completes. */
const SEAL_FRAMES = 2;
/** The handling boundary seals after the final member reaches its slot. */
export function BatchFrame({
  batchId,
  isComplete,
  x,
  y,
  width,
  frame,
  completeAt,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g>
      <rect
        data-batch-envelope={batchId}
        data-complete={isComplete}
        x={x}
        y={y}
        width={width}
        height={130}
        rx={scales.corner(tokens.corner.card)}
        fill={accent}
        fillOpacity={scales.wash(ENVELOPE_WASH)}
        stroke="none"
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${x} ${y + 20} V${y + 130} H${x + width} V${y + 20}`,
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <EnvelopeSeal {...{ batchId, x, y, width, frame, completeAt, accent }} />
    </g>
  );
}

/** The envelope's lid, drawn closed over the seal frames before completion. */
function EnvelopeSeal({
  batchId,
  x,
  y,
  width,
  frame,
  completeAt,
  accent,
}: Readonly<Omit<Props, "isComplete">>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const seal = motion.scale(SEAL_FRAMES);
  return (
    <g data-envelope-seal={batchId}>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${x} ${y + 20} V${y} H${x + width} V${y + 20}`,
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
        strokeDasharray={width + 40}
        strokeDashoffset={
          (width + 40) *
          (1 - ramp(frame, completeAt - seal, seal, motion.reveal.easing))
        }
      />
    </g>
  );
}
