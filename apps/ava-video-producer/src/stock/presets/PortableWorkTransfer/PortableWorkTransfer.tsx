import { STOCK, type GraphicProps } from "../../graphics-common";
import { getTransferSceneFromFrame } from "./getTransferSceneFromFrame";
import { TransferArtifact } from "./TransferArtifact";
import { TransferCaptions } from "./TransferCaptions";
import { TransferFolio } from "./TransferFolio";
import { TransferOwner } from "./TransferOwner";
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
  const scene = getTransferSceneFromFrame({ frame, input });
  return (
    <g>
      <TransferCaptions input={input} frame={frame} folioX={scene.folioX} />
      <path
        data-source-bench="true"
        d="M36 550 H310 M45 550 v12 M300 550 v12"
        stroke={STOCK.line}
        strokeWidth={4}
      />
      <path
        data-destination-bench="true"
        d="M330 550 H920 M340 550 v12 M910 550 v12"
        stroke={STOCK.line}
        strokeWidth={4}
      />
      {input.artifacts.map((artifact, index) => (
        <TransferArtifact
          key={artifact.id}
          artifact={artifact}
          x={50}
          y={210 + index * 86}
          isCopy={false}
          showIdentityTabs={input.showIdentityTabs}
          accent={accent}
        />
      ))}
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
