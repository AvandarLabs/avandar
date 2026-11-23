import { Arrive } from "../../../graphics-common/Arrive/Arrive";
import { DrawPath } from "../../../graphics-common/DrawPath";
import { FieldRow } from "../FieldRow";
import { SOURCE_ROW_CUE } from "../SchemaMapping.constants";
import type { SourceMappingFieldData } from "./MappingRow.types";
import type { ReactNode } from "react";

type Props = SourceMappingFieldData;

/** Renders the source mapping field layer for MappingRow. */
export function SourceMappingField(options: Readonly<Props>): ReactNode {
  return (
    <>
      <Arrive frame={options.frame} at={SOURCE_ROW_CUE} index={options.index}>
        <FieldRow
          {...options.field}
          x={options.left}
          portX={options.sourceX}
          label={options.row.label}
          isPortFirst={false}
        />
      </Arrive>
      <DrawPath
        curve={{
          from: { x: options.sourceX, y: options.y },
          to: { x: options.right, y: options.y },
        }}
        frame={options.frame}
        at={options.cue}
        color={options.color}
        opacity={options.style.edgeAlpha}
      />
    </>
  );
}
