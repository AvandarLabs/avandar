import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getTransferSceneFromFrame } from "./getTransferSceneFromFrame";
import { TransferArtifact } from "./TransferArtifact";
import { TransferBenches } from "./TransferBenches";
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
  const motion = GraphicThemeHooks.useGraphicMotion();
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
