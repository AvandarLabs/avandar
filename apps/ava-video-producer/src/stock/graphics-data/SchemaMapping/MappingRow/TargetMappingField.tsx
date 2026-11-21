import { Arrive } from "../../../graphics-common/Arrive/Arrive";
import { Text } from "../../../graphics-common/Text";
import { FieldRow } from "../FieldRow";
import { MatchRing } from "../MatchRing";
import {
  ROW_INSET,
  ROW_WIDTH,
  TARGET_ROW_CUE,
  TYPE_BASELINE,
  TYPE_INSET,
} from "../SchemaMapping.constants";
import type { TargetMappingFieldData } from "./MappingRow.types";
import type { ReactNode } from "react";

type Props = TargetMappingFieldData;

/** Renders the target mapping field layer for MappingRow. */
export function TargetMappingField(options: Readonly<Props>): ReactNode {
  return (
    <>
      <MatchRing
        y={options.y}
        color={options.color}
        opacity={options.t}
        showCheck={options.row.showChecks}
      />
      <Arrive frame={options.frame} at={TARGET_ROW_CUE} index={options.index}>
        <FieldRow
          {...options.field}
          x={options.right}
          portX={options.right}
          label={options.row.target}
          isPortFirst
        />
        <Text
          role="detail"
          x={options.right + ROW_INSET + ROW_WIDTH - TYPE_INSET}
          y={options.y + TYPE_BASELINE}
          anchor="end"
        >
          {options.row.type}
        </Text>
      </Arrive>
    </>
  );
}
