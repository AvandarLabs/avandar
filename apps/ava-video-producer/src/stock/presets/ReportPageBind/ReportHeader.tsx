import { FitText } from "../../primitives/FitText/FitText";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const { x, y, margins } = getReportPageGeometryFromInputAndFrame({
    motion,
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
      color: tokens.color.textMuted,
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
    <g
      data-report-header="first-page"
      opacity={motion.ramp(frame, 38, motion.scale(30))}
    >
      <ReportHeaderPaper x={x} y={y} margins={margins} />
      {labels.map((label) => {
        return (
          <FitText
            key={`${label.y}:${label.anchor ?? "start"}`}
            {...label}
            breakLongWords
            normalizeWhitespace
          />
        );
      })}
    </g>
  );
}
