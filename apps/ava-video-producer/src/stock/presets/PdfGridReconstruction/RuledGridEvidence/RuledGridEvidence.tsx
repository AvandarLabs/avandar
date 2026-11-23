import { SketchedShape } from "../../../primitives/SketchedShape";
import { useRuledGridEvidencePresentation } from "./useRuledGridEvidencePresentation";
import { VerticalRulingLines } from "./VerticalRulingLines";
import type { Input } from "../PdfGridReconstruction.schema.ts";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Selected structural evidence derives from the supplied grid geometry. */
export function RuledGridEvidence(props: Readonly<Props>): ReactNode {
  const presentation = useRuledGridEvidencePresentation(props);

  return (
    <g>
      {" "}
      {props.input.signal === "ruling-lines" ? (
        <g>
          <VerticalRulingLines {...presentation} />
          {Array.from(
            { length: props.input.grid.rows.length + 2 },
            (_, index) => {
              return (
                <g key={`h${index}`} data-ruling-line={`h${index}`}>
                  <SketchedShape
                    shape={{
                      kind: "line",
                      x1: 52,
                      x2: 52 + 400 * presentation.progress,
                      y1: index === 0 ? 210 : 290 + (index - 1) * 64,
                      y2: index === 0 ? 210 : 290 + (index - 1) * 64,
                    }}
                    profile={presentation.tokens.sketch.shape}
                    stroke={props.accent}
                  />
                </g>
              );
            },
          )}
        </g>
      ) : undefined}
    </g>
  );
}
