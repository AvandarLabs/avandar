import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getTransferSceneFromFrame } from "./getTransferSceneFromFrame";
import { TransferArtifact } from "./TransferArtifact";
import { TransferCaptions } from "./TransferCaptions";
import { TransferFolio } from "./TransferFolio";
import { TransferOwner } from "./TransferOwner";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./PortableWorkTransfer.schema";
import type { ReactNode } from "react";
/** Inputs for PortableWorkTransfer. */
type Props = GraphicProps & { input: Input };

/**
 * The owner carries copies across tools while source originals remain anchored.
 */
export function PortableWorkTransfer({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const scene = getTransferSceneFromFrame({ motion, frame, input });
  return (
    <g>
      <TransferCaptions input={input} frame={frame} folioX={scene.folioX} />
      <TransferBenches />
      {input.artifacts.map((artifact, index) => {
        return (
          <TransferArtifact
            key={artifact.id}
            artifact={artifact}
            x={50}
            y={210 + index * 86}
            isCopy={false}
            showIdentityTabs={input.showIdentityTabs}
            accent={accent}
          />
        );
      })}
      <TransferFolio
        input={input}
        scene={scene}
        frame={frame}
        accent={accent}
      />
      <TransferOwner scene={scene} />
    </g>
  );
}

/** The source bench and the destination bench the owner carries between. */
function TransferBenches(): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <>
      <SketchedShape
        shape={{ kind: "path", d: "M36 550 H310 M45 550 v12 M300 550 v12" }}
        profile={tokens.sketch.shape}
        data-source-bench="true"
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.heavy)}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M330 550 H920 M340 550 v12 M910 550 v12" }}
        profile={tokens.sketch.shape}
        data-destination-bench="true"
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.heavy)}
      />
    </>
  );
}
