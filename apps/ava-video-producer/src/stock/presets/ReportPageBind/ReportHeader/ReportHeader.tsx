import { FitText } from "../../../primitives/FitText/FitText";
import { ReportHeaderPaper } from "../ReportHeaderPaper";
import { useReportHeaderPresentation } from "./useReportHeaderPresentation";
import type { Input } from "../ReportPageBind.schema.ts";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** The title strip belongs to the first page throughout binding. */
export function ReportHeader(props: Readonly<Props>): ReactNode {
  const presentation = useReportHeaderPresentation(props);

  return (
    <g
      data-report-header="first-page"
      opacity={presentation.motion.ramp(
        props.frame,
        38,
        presentation.motion.scale(30),
      )}
    >
      <ReportHeaderPaper
        x={presentation.x}
        y={presentation.y}
        margins={presentation.margins}
      />
      {presentation.labels.map((label) => {
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
