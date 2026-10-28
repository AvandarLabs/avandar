import { STOCK } from "../../stockPalette";
import { FolioCopies } from "./FolioCopies";
import { FolioCover } from "./FolioCover";
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
 * A single folio keeps its load rigid during travel and opens only if accepted.
 */
export function TransferFolio({
  input,
  scene,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const body = {
    x: scene.folioX,
    y: 198,
    width: 264,
    height: input.artifacts.length * 86 + 10,
    rx: 8,
    fill: STOCK.elevated,
    stroke: STOCK.orange,
    strokeWidth: 2,
  };
  return (
    <g>
      <rect data-folio="one" {...body} />
      <path
        d={`M${scene.folioX + 100} 198 v-14 h50 v14`}
        fill="none"
        stroke={STOCK.orange}
        strokeWidth={3}
      />
      <FolioCopies input={input} scene={scene} frame={frame} accent={accent} />
      <FolioCover
        input={input}
        folioX={scene.folioX}
        opening={scene.opening}
        frame={frame}
      />
    </g>
  );
}
