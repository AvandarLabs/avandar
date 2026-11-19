import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { RetainedRecord } from "./RetainedRecord";
import type { Input } from "./PluginCapabilityInstall.schema";
import type { ReactNode } from "react";

type Props = { input: Input; accent: string; frame: number };
/** The dash of the counting stencil. */
const STENCIL_DASH = "5 5";
/** Stable rows retain IDs and exact category ownership under the stencil. */
export function RetainedRecordStrip({
  input,
  accent,
  frame,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  return (
    <g>
      {input.records.map((record, index) => {
        return (
          <RetainedRecord
            key={record.id}
            {...{ record, index, input, accent }}
          />
        );
      })}
      {input.installation.choice === "install" ? (
        <StockRect
          data-counting-stencil=""
          x={244}
          y={148}
          width={225}
          height={input.records.length * 48 + 7}
          rx={scales.corner(tokens.corner.cell)}
          fill="none"
          stroke={accent}
          strokeDasharray={STENCIL_DASH}
          opacity={motion.ramp(frame, 56, motion.scale(34))}
        />
      ) : null}
    </g>
  );
}
