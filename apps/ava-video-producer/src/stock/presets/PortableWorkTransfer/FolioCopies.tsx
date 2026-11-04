import { TransferArtifact } from "./TransferArtifact";
import type { getTransferSceneFromFrame } from "./getTransferSceneFromFrame";
import type { Input } from "./PortableWorkTransfer.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  scene: ReturnType<typeof getTransferSceneFromFrame>;
  frame: number;
  accent: string;
};
/**
 * Each copy has a stable label and identity during packing, travel and
 * placement.
 */
export function FolioCopies({
  input,
  scene,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {scene.copies.map(({ artifact, x, y }) => (
        <g
          key={artifact.id}
          opacity={frame >= 43 ? 1 : 0}
          data-destination-use={
            frame >= 130 && input.transferState === "accepted"
              ? true
              : undefined
          }
        >
          <TransferArtifact
            artifact={artifact}
            x={x}
            y={y}
            isCopy
            showIdentityTabs={input.showIdentityTabs}
            accent={accent}
          />
        </g>
      ))}
    </g>
  );
}
