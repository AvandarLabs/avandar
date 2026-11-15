import { ramp } from "../../../motion";
import { wrapTextToLines } from "../../primitives/FitText/wrapTextToLines";
import { getConservativeWidthFromText } from "../../text/getConservativeWidthFromText";
import type { Input } from "./ProvenancePeelback.schema";
import type { ReactNode } from "react";

type Props = {
  source: Input["sources"][number];
  frame: number;
  accent: string;
};
/** Underline only the selected source's first actual excerpt line. */
export function CitationUnderline({
  source,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const firstLine =
    wrapTextToLines({
      text: source.excerpt,
      width: 368,
      fontSize: 14,
      maxLines: 8,
      breakLongWords: true,
      normalizeWhitespace: true,
    })[0] ?? "";
  const width = Math.min(
    368,
    getConservativeWidthFromText({ text: firstLine, fontSize: 14 }),
  );
  return (
    <line
      data-citation-underline={source.id}
      x1={16}
      y1={96}
      x2={16 + width}
      y2={96}
      stroke={accent}
      strokeWidth={1}
      opacity={ramp(frame, 82, 22)}
    />
  );
}
