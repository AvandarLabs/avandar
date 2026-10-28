import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./DashboardSlotAssembly.schema";
import type { ReactNode } from "react";

type Props = {
  widget: Input["widgets"][number];
  x: number;
  y: number;
  width: number;
  bodyLines: number;
  accent: string;
};
const TEXT: { breakLongWords: boolean; normalizeWhitespace: boolean } = {
  breakLongWords: true,
  normalizeWhitespace: true,
};
/** Widget kind selects a stable typographic treatment without merging lines. */
export function DashboardWidgetContent({
  widget,
  x,
  y,
  width,
  bodyLines,
  accent,
}: Readonly<Props>): ReactNode {
  const label = {
    x: x + (widget.kind === "list" ? 22 : 12),
    width: width - (widget.kind === "list" ? 34 : 24),
    fontSize: widget.kind === "value" ? (16 as const) : (12 as const),
    maxLines: widget.kind === "value" ? 4 : bodyLines,
    color: widget.kind === "note" ? STOCK.muted : STOCK.text,
  };
  return (
    <g>
      {widget.lines.map((text, lineIndex) => {
        const lineY = y + lineIndex * bodyLines * 15.6;
        return (
          <g
            key={lineIndex}
            data-widget-line={widget.id}
            data-line-index={lineIndex}
          >
            {widget.kind === "list" ? (
              <circle cx={x + 14} cy={lineY - 4} r={2} fill={accent} />
            ) : undefined}
            <FitText {...TEXT} {...label} text={text} y={lineY} />
          </g>
        );
      })}
    </g>
  );
}
