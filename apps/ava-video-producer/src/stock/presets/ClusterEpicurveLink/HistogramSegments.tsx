import { mix } from "../../../motion";
import { useGraphicMotion, useGraphicTheme, useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import { getCasePositionsFromInput } from "./getCasePositionsFromInput";
import type { Input } from "./ClusterEpicurveLink.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };

/**
 * Every case supplies exactly one numbered segment, including unknown onset.
 */
export function HistogramSegments({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  return (
    <g>
      {getCasePositionsFromInput(input).map(
        ({ record, index, histogramX, histogramY, isInvestigated }) => {
          return (
            <g
              key={record.id}
              data-histogram-case={record.id}
              data-onset-bin={record.onsetBinId ?? undefined}
              data-unknown-onset={record.onsetBinId === null}
            >
              <rect
                x={histogramX - 15}
                y={histogramY - 13}
                width={30}
                height={15}
                fill={
                  isInvestigated && frame >= 36
                    ? accent
                    : tokens.color.accentAlt
                }
                fillOpacity={
                  isInvestigated
                    ? mix(
                        motion.ramp(frame, 36, motion.scale(48)),
                        atomic.opacity["45"],
                        1,
                      )
                    : tokens.alpha.dimmed
                }
              />
              <text
                x={histogramX}
                y={histogramY - 1}
                fontFamily={tokens.text.graphic.data.fontFamily}
                fontSize={tokens.text.graphic.data.fontSize}
                fill={
                  isInvestigated && frame >= 36
                    ? tokens.color.onAccent
                    : tokens.color.text
                }
                textAnchor="middle"
              >
                {index + 1}
              </text>
            </g>
          );
        },
      )}
    </g>
  );
}
