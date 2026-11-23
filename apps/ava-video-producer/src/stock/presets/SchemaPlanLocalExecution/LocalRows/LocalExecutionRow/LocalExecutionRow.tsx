import { SketchedShape } from "../../../../primitives/SketchedShape";
import { getLocalExecutionRowLayout } from "./getLocalExecutionRowLayout";
import { LocalExecutionRowBody } from "./LocalExecutionRowBody";
import { LocalExecutionRowValues } from "./LocalExecutionRowValues";
import type { useLocalRowsPresentation } from "../useLocalRowsPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useLocalRowsPresentation>,
  "input" | "frame" | "accent" | "tokens" | "motion" | "scales"
> & {
  row: ReturnType<typeof useLocalRowsPresentation>["input"]["rows"][number];
  index: number;
};
/** Render one local execution row. */
export function LocalExecutionRow(props: Readonly<Props>): ReactNode {
  const presentation = getLocalExecutionRowLayout(props);

  return (
    <g key={props.row.id} data-local-row={props.row.id}>
      <LocalExecutionRowBody {...presentation} />
      <LocalExecutionRowValues {...presentation} />
      {presentation.applied > 0 ? (
        <SketchedShape
          shape={{
            kind: "path",
            d: presentation.selected
              ? `M520 ${359 + props.index * 32} l6 5 l12 -12`
              : `M520 ${359 + props.index * 32} h15`,
          }}
          profile={props.tokens.sketch.shape}
          data-row-selected={presentation.selected ? props.row.id : undefined}
          stroke={
            presentation.selected ? props.accent : props.tokens.color.inactive
          }
          fill="none"
          strokeWidth={props.scales.stroke(props.tokens.stroke.default)}
        />
      ) : undefined}
    </g>
  );
}
