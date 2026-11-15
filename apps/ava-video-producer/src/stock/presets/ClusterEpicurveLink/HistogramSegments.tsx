import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { getCasePositionsFromInput } from "./getCasePositionsFromInput";
import type { Input } from "./ClusterEpicurveLink.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };

function _getIdentityInk(accent: string): string {
  const channels = accent.slice(1).match(/../g) ?? [];
  const luminance = channels.reduce((sum, channel, index) => {
    const value = Number.parseInt(channel, 16) / 255;
    const linear =
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    return sum + linear * [0.2126, 0.7152, 0.0722][index];
  }, 0);
  return luminance > 0.179 ? "#000000" : "#ffffff";
}

/**
 * Every case supplies exactly one numbered segment, including unknown onset.
 */
export function HistogramSegments({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {getCasePositionsFromInput(input).map(
        ({ record, index, histogramX, histogramY, isInvestigated }) => (
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
              fill={isInvestigated && frame >= 36 ? accent : STOCK.cyan}
              fillOpacity={
                isInvestigated ? 0.45 + 0.55 * ramp(frame, 36, 48) : 0.4
              }
            />
            <text
              x={histogramX}
              y={histogramY - 1}
              fontSize={12}
              fill={
                isInvestigated && frame >= 36
                  ? _getIdentityInk(accent)
                  : STOCK.text
              }
              textAnchor="middle"
            >
              {index + 1}
            </text>
          </g>
        ),
      )}
    </g>
  );
}
