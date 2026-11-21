import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { RetainedRecord } from "./RetainedRecord";
import type { Input } from "./PluginCapabilityInstall.schema";
import type { ReactNode } from "react";

type Props = { input: Input; accent: string; frame: number };
/** Stable rows retain IDs and exact category ownership under the stencil. */
export function RetainedRecordStrip({
  input,
  accent,
  frame,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
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
          strokeDasharray={tokens.dash.placeholder.join(" ")}
          opacity={motion.ramp(frame, 56, motion.scale(34))}
        />
      ) : null}
    </g>
  );
}
