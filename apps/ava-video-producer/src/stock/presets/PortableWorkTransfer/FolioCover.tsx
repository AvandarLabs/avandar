import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { Input } from "./PortableWorkTransfer.schema";
import type { ReactNode } from "react";
type Props = { input: Input; folioX: number; opening: number; frame: number };
/**
 * The closed cover hides usable contents while retaining the exterior manifest.
 */
export function FolioCover({
  input,
  folioX,
  opening,
  frame,
}: Readonly<Props>): ReactNode {
  const isClosed = frame >= 92 && opening === 0;
  const cover = {
    x: folioX,
    y: 198,
    width: 264 * (1 - opening),
    height: input.artifacts.length * 86 + 10,
    rx: 8,
    fill: STOCK.elevated,
    stroke: STOCK.orange,
    opacity: frame >= 92 ? 1 : 0,
  };
  return (
    <g>
      <rect
        data-folio-cover="true"
        data-folio-closed={isClosed ? true : undefined}
        {...cover}
      />
      {isClosed
        ? input.artifacts.map((artifact, index) => (
            <LabelSlots
              key={artifact.id}
              labels={[
                [artifact.label, folioX + 22, 238 + index * 86, 220, 14, 3],
              ]}
            />
          ))
        : undefined}
    </g>
  );
}
