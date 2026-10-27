import { mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { getReportPageGeometryFromInputAndFrame } from "./getReportPageGeometryFromInputAndFrame";
import { ReportPageCopy } from "./ReportPageCopy";
import type { Input } from "./ReportPageBind.schema";
import type { ReactNode } from "react";

type Props = {
  section: Input["sections"][number];
  index: number;
  frame: number;
  input: Input;
  accent: string;
};
/** A section keeps its page identity while paper margins extend around it. */
export function ReportPage({
  section,
  index,
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const { x, y, margins } = getReportPageGeometryFromInputAndFrame({
    input,
    frame,
    index,
  });
  return (
    <g
      data-page={section.id}
      transform={`translate(${x} ${y})`}
      opacity={ramp(frame, 12 + index * 2, 12)}
    >
      <rect
        data-page-paper={section.id}
        x={-16}
        y={-8}
        width={mix(margins, 740, 800)}
        height={mix(margins, 86, 136)}
        rx={4}
        fill={STOCK.surface}
        stroke={STOCK.line}
      />
      <path
        d="M0 6V108"
        stroke={accent}
        strokeWidth={mix(margins, 1, 3)}
        opacity={margins}
      />
      <ReportPageCopy
        section={section}
        index={index}
        showPageNumbers={input.showPageNumbers}
        margins={margins}
        accent={accent}
      />
    </g>
  );
}
