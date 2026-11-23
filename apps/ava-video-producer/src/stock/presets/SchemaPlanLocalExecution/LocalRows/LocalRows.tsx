import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { LocalExecutionRow } from "./LocalExecutionRow/LocalExecutionRow";
import { useLocalRowsPresentation } from "./useLocalRowsPresentation";
import type { Input } from "../SchemaPlanLocalExecution.schema.ts";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * Local row occurrences and exact numeric values never cross the device edge.
 */
export function LocalRows(props: Readonly<Props>): ReactNode {
  const presentation = useLocalRowsPresentation(props);

  return (
    <g data-local-table="true">
      <LabelSlots
        labels={[
          [props.input.columns.category, 60, 312, 230, 16, 2],
          [props.input.columns.measure, 310, 312, 230, 16, 2],
        ]}
      />
      {props.input.rows.map((row, index) => {
        return (
          <LocalExecutionRow
            key={row.id}
            {...presentation}
            row={row}
            index={index}
          />
        );
      })}
    </g>
  );
}
