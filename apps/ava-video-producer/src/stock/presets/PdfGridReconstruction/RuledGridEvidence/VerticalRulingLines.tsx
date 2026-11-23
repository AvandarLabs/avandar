import { SketchedShape } from "../../../primitives/SketchedShape";
import type { useRuledGridEvidencePresentation } from "./useRuledGridEvidencePresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useRuledGridEvidencePresentation>,
  "input" | "width" | "height" | "progress" | "tokens" | "accent"
>;
/** Render the vertical ruling lines. */
export function VerticalRulingLines(props: Readonly<Props>): ReactNode {
  return (
    <>
      {Array.from(
        { length: props.input.grid.columnLabels.length + 1 },
        (_, index) => {
          return (
            <g key={`v${index}`} data-ruling-line={`v${index}`}>
              <SketchedShape
                shape={{
                  kind: "line",
                  x1: 52 + index * props.width,
                  x2: 52 + index * props.width,
                  y1: 210,
                  y2: 210 + props.height * props.progress,
                }}
                profile={props.tokens.sketch.shape}
                stroke={props.accent}
              />
            </g>
          );
        },
      )}
    </>
  );
}
