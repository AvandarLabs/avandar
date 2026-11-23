import { FitText } from "../../../primitives/FitText/FitText";
import { useReportPageCopyPresentation } from "./useReportPageCopyPresentation";
import type { Input } from "../ReportPageBind.schema.ts";
import type { ReactNode } from "react";

type Props = {
  section: Input["sections"][number];
  index: number;
  showPageNumbers: boolean;
  margins: number;
  accent: string;
};
/** The section remains readable and its page number follows source order. */
export function ReportPageCopy(props: Readonly<Props>): ReactNode {
  const presentation = useReportPageCopyPresentation(props);

  return (
    <g>
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
      {props.showPageNumbers ? (
        <text
          data-page-number={props.index + 1}
          x={-4}
          y={112}
          fill={props.accent}
          fontFamily={presentation.tokens.text.graphic.data.fontFamily}
          fontWeight={presentation.tokens.text.graphic.data.fontWeight}
          fontSize={presentation.tokens.text.graphic.data.fontSize}
          textAnchor="middle"
          opacity={props.margins}
        >
          {props.index + 1}
        </text>
      ) : undefined}
    </g>
  );
}
