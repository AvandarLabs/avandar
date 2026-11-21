import { LiteralDataText } from "../../../../primitives/LiteralDataText/LiteralDataText";
import { SketchedShape } from "../../../../primitives/SketchedShape";
import type { getLocalExecutionRowLayout } from "./getLocalExecutionRowLayout";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof getLocalExecutionRowLayout>,
  "input" | "row" | "index" | "tokens" | "scales"
>;
/** Render the local execution row values. */
export function LocalExecutionRowValues(props: Readonly<Props>): ReactNode {
  return (
    <>
      {props.input.showRows ? (
        <g>
          <LiteralDataText
            value={props.row.category}
            x={60}
            y={363 + props.index * 32}
          />
          <g data-raw-value={props.row.value}>
            <LiteralDataText
              value={String(props.row.value)}
              x={310}
              y={363 + props.index * 32}
            />
          </g>
        </g>
      ) : (
        <SketchedShape
          shape={{
            kind: "path",
            d: `M60 ${359 + props.index * 32} h130 M310 ${359 + props.index * 32} h70`,
          }}
          profile={props.tokens.sketch.shape}
          data-hidden-cells={props.row.id}
          stroke={props.tokens.color.inactive}
          strokeWidth={props.scales.stroke(props.tokens.stroke.heavy)}
        />
      )}
    </>
  );
}
