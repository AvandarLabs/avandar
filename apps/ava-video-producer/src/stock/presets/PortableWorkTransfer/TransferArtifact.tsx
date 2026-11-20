import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./PortableWorkTransfer.schema";
import type { ReactNode } from "react";

type Props = {
  artifact: Input["artifacts"][number];
  x: number;
  y: number;
  isCopy: boolean;
  showIdentityTabs: boolean;
  accent: string;
};
/**
 * A labeled work original or its same-ID transfer copy, never a new identity.
 */
export function TransferArtifact({
  artifact,
  x,
  y,
  isCopy,
  showIdentityTabs,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g
      data-original={isCopy ? undefined : artifact.id}
      data-transfer-copy={isCopy ? artifact.id : undefined}
    >
      <StockRect
        data-artifact-body={artifact.id}
        x={x}
        y={y}
        width={240}
        height={80}
        rx={scales.corner(tokens.corner.chip)}
        fill={tokens.color.surface}
        stroke={isCopy ? accent : tokens.color.line}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d:
            artifact.kind === "chart"
              ? `M${x + 8} ${y + 30} v-14 m7 14 v-24 m7 24 v-18`
              : artifact.kind === "sheet"
                ? `M${x + 8} ${y + 10} h20 v22 h-20 Z m0 11 h20 m-10 -11 v22`
                : `M${x + 8} ${y + 10} h20 m-20 8 h20 m-20 8 h12`,
        }}
        profile={tokens.sketch.shape}
        data-artifact-kind={artifact.kind}
        fill="none"
        stroke={accent}
      />
      <LabelSlots
        labels={[
          [artifact.label, x + 36, y + 15, 196, 14, 3],
          ...(showIdentityTabs
            ? [
                [artifact.id, x + 36, y + 62, 196, 12, 2] as [
                  string,
                  number,
                  number,
                  number,
                  12,
                  number,
                ],
              ]
            : []),
        ]}
      />
    </g>
  );
}
