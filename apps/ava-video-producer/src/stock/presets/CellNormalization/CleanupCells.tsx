import { mix } from "../../../motion";
import { CellLiteralValue } from "./CellLiteralValue";
import type { Input } from "./CellNormalization.schema";
import type { ReactNode } from "react";
type Props = {
  row: Input["rows"][number];
  edit: number;
  showWhitespace: boolean;
  accent: string;
};
/** Only explicitly different pairs get an authored replacement and brackets. */
export function CleanupCells({
  row,
  edit,
  showWhitespace,
  accent,
}: Readonly<Props>): ReactNode {
  const changed = row.before !== row.after;
  const bounds = { x: 88, y: 22, showWhitespace };
  return (
    <g>
      <g data-before-cell={row.id}>
        <CellLiteralValue
          {...bounds}
          value={row.before}
          opacity={changed ? 1 - edit : 1}
          letterSpacing={mix(edit, 1, 0)}
        />
      </g>
      {changed ? (
        <g data-replacement={row.id} opacity={edit}>
          <CellLiteralValue {...bounds} value={row.after} color={accent} />
          <path
            data-edit-bracket={row.id}
            d="M80 6h-5v26h5M468 6h5v26h-5"
            fill="none"
            stroke={accent}
            opacity={Math.sin(edit * Math.PI) * 0.7 + edit * 0.3}
          />
        </g>
      ) : undefined}
    </g>
  );
}
