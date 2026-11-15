import { Pill } from "../../graphics-common";
import { FitText } from "../../primitives/FitText/FitText";
import { wrapTextToLines } from "../../primitives/FitText/wrapTextToLines";
import { getLegacyWidthFromText } from "../legacy/getLegacyWidthFromText/getLegacyWidthFromText";
import type { ReactNode } from "react";

type Props = { label: string; accent: string };

/**
 * Keeps short route badges compact and long authored summaries in the header.
 */
export function TraversalRouteSummary({
  label,
  accent,
}: Readonly<Props>): ReactNode {
  const textWidth = getLegacyWidthFromText({
    text: label,
    fontSize: 13,
    mono: true,
  });
  if (textWidth <= 140) {
    return <Pill x={744} y={44} width={152} text={label} color={accent} />;
  }
  if (textWidth <= 356) {
    const width = Math.ceil(textWidth + 20 - 1e-9);
    return (
      <Pill x={896 - width} y={44} width={width} text={label} color={accent} />
    );
  }
  const lines = wrapTextToLines({
    text: label,
    width: 344,
    fontSize: 12,
    maxLines: 4,
  });
  return (
    <g>
      <rect
        x={520}
        y={44}
        width={376}
        height={24 + lines.length * 15.6}
        rx={12}
        fill={accent}
        fillOpacity={0.08}
        stroke={accent}
        strokeOpacity={0.32}
      />
      <FitText
        x={536}
        y={65}
        width={344}
        fontSize={12}
        maxLines={4}
        text={label}
      />
    </g>
  );
}
