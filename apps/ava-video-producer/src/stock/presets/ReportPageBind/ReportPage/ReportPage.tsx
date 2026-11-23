import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { ReportPageCopy } from "../ReportPageCopy/ReportPageCopy";
import { PagePaper } from "./PagePaper";
import { useReportPagePresentation } from "./useReportPagePresentation";
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
export function ReportPage(props: Readonly<Props>): ReactNode {
  const presentation = useReportPagePresentation(props);

  return (
    <g
      data-page={props.section.id}
      transform={`translate(${presentation.x} ${presentation.y})`}
      opacity={presentation.motion.reveal(
        props.frame,
        12 + props.index * presentation.motion.stagger.list,
      )}
    >
      <PagePaper sectionId={props.section.id} margins={presentation.margins} />
      <SketchedShape
        shape={{ kind: "path", d: "M0 6V108" }}
        profile={presentation.tokens.sketch.shape}
        stroke={props.accent}
        strokeWidth={presentation.scales.stroke(
          Motion.mix({
            t: presentation.margins,
            from: presentation.tokens.stroke.hairline,
            to: presentation.tokens.stroke.emphasis,
          }),
        )}
        opacity={presentation.margins}
      />
      <ReportPageCopy
        section={props.section}
        index={props.index}
        showPageNumbers={props.input.showPageNumbers}
        margins={presentation.margins}
        accent={props.accent}
      />
    </g>
  );
}
