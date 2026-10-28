import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import { getReportPageGeometryFromInputAndFrame } from "./getReportPageGeometryFromInputAndFrame";
import { ReportHeaderPaper } from "./ReportHeaderPaper";
import type { Input } from "./ReportPageBind.schema";
import type { ReactNode, ComponentProps } from "react";
type Props = { input: Input; frame: number; accent: string };
/** The title strip belongs to the first page throughout binding. */
export function ReportHeader({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { x, y, margins } = getReportPageGeometryFromInputAndFrame({
    input,
    frame,
    index: 0,
  });
  const labels: Array<ComponentProps<typeof FitText>> = [
    {
      text: input.reportTitle,
      x,
      y: 44,
      width: 770,
      fontSize: 24,
      maxLines: 2,
    },
    {
      text: input.byline,
      x,
      y: 106,
      width: 620,
      fontSize: 14,
      maxLines: 1,
      color: STOCK.muted,
    },
    {
      text: input.formatLabel,
      x: x + 768,
      y: 106,
      width: 220,
      fontSize: 14,
      maxLines: 1,
      anchor: "end",
      color: accent,
    },
  ];
  return (
    <g data-report-header="first-page" opacity={ramp(frame, 38, 30)}>
      <ReportHeaderPaper x={x} y={y} margins={margins} />
      {labels.map((label) => (
        <FitText
          key={`${label.y}:${label.anchor ?? "start"}`}
          {...label}
          breakLongWords
          normalizeWhitespace
        />
      ))}
    </g>
  );
}
