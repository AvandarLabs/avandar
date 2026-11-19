import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { CellLiteralValue } from "./CellLiteralValue";
import type { Input } from "./CellNormalization.schema";
import type { ReactNode } from "react";

type Props = {
  row: Input["rows"][number];
  edit: number;
  showWhitespace: boolean;
  accent: string;
};

/** Extra letter spacing the original value loosens from as it is replaced. */
const BEFORE_SPACING = 1;
/** Only explicitly different pairs get an authored replacement and brackets. */
export function CleanupCells({
  row,
  edit,
  showWhitespace,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const changed = row.before !== row.after;
  const bounds = { x: 88, y: 22, showWhitespace };
  return (
    <g>
      <g data-before-cell={row.id}>
        <CellLiteralValue
          {...bounds}
          value={row.before}
          opacity={changed ? 1 - edit : 1}
          letterSpacing={mix(edit, BEFORE_SPACING, 0)}
        />
      </g>
      {changed ? (
        <g data-replacement={row.id} opacity={edit}>
          <CellLiteralValue {...bounds} value={row.after} color={accent} />
          <g data-edit-bracket={row.id}>
            <SketchedShape
              shape={{ kind: "path", d: "M80 6h-5v26h5M468 6h5v26h-5" }}
              profile={tokens.sketch.shape}
              fill="none"
              stroke={accent}
              opacity={
                Math.sin(edit * Math.PI) * atomic.opacity["70"] +
                edit * atomic.opacity["30"]
              }
            />
          </g>
        </g>
      ) : undefined}
    </g>
  );
}
