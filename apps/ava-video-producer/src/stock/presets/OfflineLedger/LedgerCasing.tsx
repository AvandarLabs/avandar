import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./OfflineLedger.schema";
import type { ReactNode } from "react";

type Props = { shape: Input["deviceShape"]; accent: string };

/** A tablet or laptop casing's corner before the corner style scales it. */
const DEVICE_CORNER = 22;
/** Three casing silhouettes retain the same notebook and storage geometry. */
export function LedgerCasing({ shape, accent }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g data-casing={shape}>
      <StockRect
        x={156}
        y={104}
        width={648}
        height={390}
        rx={scales.corner(
          shape === "notebook" ? tokens.corner.chip : DEVICE_CORNER,
        )}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      {shape === "laptop" ? (
        <SketchedShape
          shape={{ kind: "path", d: "M156 494 h648 l32 10 h-712 z" }}
          profile={tokens.sketch.shape}
          fill={tokens.color.elevated}
          stroke={tokens.color.line}
        />
      ) : undefined}
      {shape === "notebook" ? (
        <SketchedShape
          shape={{
            kind: "path",
            d: "M178 108 v382 M168 124 h20 M168 160 h20 M168 196 h20 M168 232 h20 M168 268 h20 M168 304 h20",
          }}
          profile={tokens.sketch.shape}
          stroke={accent}
        />
      ) : undefined}
    </g>
  );
}
