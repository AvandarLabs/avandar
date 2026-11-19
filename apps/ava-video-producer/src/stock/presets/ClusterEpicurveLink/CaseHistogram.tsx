import { SketchedShape } from "../../primitives/SketchedShape";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import { HistogramLabels } from "./HistogramLabels";
import { HistogramSegments } from "./HistogramSegments";
import type { Input } from "./ClusterEpicurveLink.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * The complete ordered histogram retains a distinct unknown-time compartment.
 */
export function CaseHistogram({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <g>
      {Array.from({ length: input.timeBins.length + 1 }, (_, index) => {
        return (
          <g key={index}>
            <SketchedShape
              shape={{
                kind: "line",
                x1: 348 + index * 38,
                y1: 343,
                x2: 382 + index * 38,
                y2: 343,
              }}
              profile={tokens.sketch.shape}
              stroke={tokens.color.line}
            />
            <text
              x={365 + index * 38}
              y={361}
              textAnchor="middle"
              fill={tokens.color.textMuted}
              fontFamily={tokens.text.graphic.data.fontFamily}
              fontWeight={tokens.text.graphic.data.fontWeight}
              fontSize={tokens.text.graphic.data.fontSize}
            >
              {index === input.timeBins.length ? "?" : index + 1}
            </text>
          </g>
        );
      })}
      <HistogramSegments input={input} frame={frame} accent={accent} />
      <HistogramLabels input={input} />
    </g>
  );
}
