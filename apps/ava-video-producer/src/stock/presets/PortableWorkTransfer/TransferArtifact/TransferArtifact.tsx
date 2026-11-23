import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect";
import { TransferArtifactLabels } from "./TransferArtifactLabels";
import { useTransferArtifactPresentation } from "./useTransferArtifactPresentation";
import type { Input } from "../PortableWorkTransfer.schema.ts";
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
export function TransferArtifact(props: Readonly<Props>): ReactNode {
  const presentation = useTransferArtifactPresentation(props);

  return (
    <g
      data-original={props.isCopy ? undefined : props.artifact.id}
      data-transfer-copy={props.isCopy ? props.artifact.id : undefined}
    >
      <StockRect
        data-artifact-body={props.artifact.id}
        x={props.x}
        y={props.y}
        width={240}
        height={80}
        rx={presentation.scales.corner(presentation.tokens.corner.chip)}
        fill={presentation.tokens.color.surface}
        stroke={props.isCopy ? props.accent : presentation.tokens.color.line}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d:
            props.artifact.kind === "chart"
              ? `M${props.x + 8} ${props.y + 30} v-14 m7 14 v-24 m7 24 v-18`
              : props.artifact.kind === "sheet"
                ? `M${props.x + 8} ${props.y + 10} h20 v22 h-20 Z m0 11 h20 m-10 -11 v22`
                : `M${props.x + 8} ${props.y + 10} h20 m-20 8 h20 m-20 8 h12`,
        }}
        profile={presentation.tokens.sketch.shape}
        data-artifact-kind={props.artifact.kind}
        fill="none"
        stroke={props.accent}
      />
      <TransferArtifactLabels {...presentation} />
    </g>
  );
}
