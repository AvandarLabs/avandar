import { mix } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { type CaseProps as Props } from "./HistogramSegmentsShared.types";
import type { ReactNode } from "react";
/** One case's numbered segment, lit once its investigation is linked. */
export function HistogramCase({
  position: { record, index, histogramX, histogramY, isInvestigated },
  frame,
  accent,
}: Props): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const isLit = isInvestigated && frame >= 36;
  return (
    <g
      data-histogram-case={record.id}
      data-onset-bin={record.onsetBinId ?? undefined}
      data-unknown-onset={record.onsetBinId === null}
    >
      <rect
        x={histogramX - 15}
        y={histogramY - 13}
        width={30}
        height={15}
        fill={isLit ? accent : tokens.color.accentAlt}
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
        fontWeight={tokens.text.graphic.data.fontWeight}
        fontSize={tokens.text.graphic.data.fontSize}
        fill={isLit ? tokens.color.onAccent : tokens.color.text}
        textAnchor="middle"
      >
        {index + 1}
      </text>
    </g>
  );
}
