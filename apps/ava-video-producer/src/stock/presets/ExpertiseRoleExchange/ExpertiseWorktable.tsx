import { ramp } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import {
  DEMONSTRATE_CUE,
  HANDOFF_CUE,
  SECOND_DEMONSTRATION_CUE,
} from "./exchangeTiming";
import type { Input } from "./ExpertiseRoleExchange.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string; toolX: number };

/** Frames each demonstration takes to fold or measure. */
const DEMONSTRATION_FRAMES = 22;
/** The tool's corner before the corner style scales it. */
const TOOL_CORNER = 2;
/**
 * A shared table supports a visibly handled folding guide or alignment ruler.
 */
export function ExpertiseWorktable({
  input,
  frame,
  accent,
  toolX,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const toolWidth = scales.stroke(tokens.stroke.default);
  const isFirst = frame < HANDOFF_CUE;
  const topic = input.topics[isFirst ? 0 : 1];
  const demonstration = ramp(
    frame,
    isFirst ? DEMONSTRATE_CUE : SECOND_DEMONSTRATION_CUE,
    motion.scale(DEMONSTRATION_FRAMES),
    motion.entrance.easing,
  );
  return (
    <g opacity={motion.reveal(frame, 16)}>
      <SketchedShape
        shape={{
          kind: "path",
          d: "M290 330 H675 V356 H290 Z M320 356 V390 M655 356 V390",
        }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <StockRect
        x={350}
        y={312}
        width={260}
        height={16}
        fill="none"
        stroke={tokens.color.inactive}
      />
      <g
        opacity={ramp(
          frame,
          DEMONSTRATE_CUE,
          motion.panel,
          motion.reveal.easing,
        )}
      >
        <rect
          data-demonstration-tool={topic.demonstration}
          x={toolX}
          y={325}
          width={90}
          height={8}
          rx={scales.corner(TOOL_CORNER)}
          fill={accent}
        />
        {topic.demonstration === "fold-guide" ? (
          <SketchedShape
            shape={{
              kind: "path",
              d: `M${toolX} 325 l${45 * demonstration} -24 h45 l${-45 * demonstration} 24`,
            }}
            profile={tokens.sketch.shape}
            fill={tokens.color.surface}
            stroke={accent}
            strokeWidth={toolWidth}
          />
        ) : (
          <SketchedShape
            shape={{
              kind: "path",
              d: `M${toolX + 6} 317 h78 M${toolX + 12} 317 v8 M${toolX + 30} 317 v8 M${toolX + 48} 317 v8 M${toolX + 66} 317 v8`,
            }}
            profile={tokens.sketch.shape}
            stroke={accent}
            fill="none"
            strokeWidth={toolWidth}
          />
        )}
      </g>
    </g>
  );
}
