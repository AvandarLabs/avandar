import { STOCK } from "../../stockPalette";
import { AliquotTubeLabels } from "./AliquotTubeLabels";
import type { Input } from "./SpecimenAliquotBalance.schema";
import type { ReactNode } from "react";

type Props = {
  tube: Input["parent"];
  parentId: string;
  x: number;
  volume: number;
  showIdentity: boolean;
  accent: string;
  isChild?: boolean;
};
/**
 * Equal-width tubes encode the same material scale, including empty parents.
 */
export function AliquotTube({
  tube,
  parentId,
  x,
  volume,
  showIdentity,
  accent,
  isChild = false,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {showIdentity && isChild ? (
        <path
          data-lineage={tube.id}
          d={`M110 148 V126 H${x} V148`}
          stroke={STOCK.line}
          fill="none"
        />
      ) : undefined}
      <path
        d={`M${x - 25} 148 V262 Q${x - 25} 278 ${x} 278 Q${x + 25} 278 ${x + 25} 262 V148 Z`}
        fill={STOCK.surface}
        stroke={STOCK.muted}
        strokeWidth={2}
      />
      <rect
        data-liquid-id={tube.id}
        data-parent-id={parentId}
        x={x - 20}
        y={270 - volume * 9}
        width={40}
        height={volume * 9}
        fill={accent}
        opacity={0.7}
      />
      <path
        d={`M${x - 29} 146 H${x + 29}`}
        stroke={STOCK.cyan}
        strokeWidth={7}
      />
      <AliquotTubeLabels
        tube={tube}
        x={x}
        volume={volume}
        showIdentity={showIdentity}
      />
    </g>
  );
}
