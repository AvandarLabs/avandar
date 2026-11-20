import { mix } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getReportPageGeometryFromInputAndFrame } from "../getReportPageGeometryFromInputAndFrame";
import { ReportPageCopy } from "../ReportPageCopy";
import { PagePaper } from "./PagePaper";
import type { Input } from "../ReportPageBind.schema";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const { x, y, margins } = getReportPageGeometryFromInputAndFrame({
    motion,
    input,
    frame,
    index,
  });
  return (
    <g
      data-page={section.id}
      transform={`translate(${x} ${y})`}
      opacity={motion.reveal(frame, 12 + index * motion.stagger.list)}
    >
      <PagePaper sectionId={section.id} margins={margins} />
      <SketchedShape
        shape={{ kind: "path", d: "M0 6V108" }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={scales.stroke(
          mix(margins, tokens.stroke.hairline, tokens.stroke.emphasis),
        )}
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
