import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { buildZoneOutlineFromCells } from "../buildZoneOutlineFromCells";
import { getGroupingFromCells } from "../getGroupingFromCells";
import { PartitionOutlines } from "./PartitionOutlines";
import type { Input } from "../BoundaryRegroupingEffect.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Raised group seams leave the atomic grid fixed below them. */
export function GroupingSeams({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g>
      {[0, 1].map((index) => {
        return (
          <g
            key={index}
            data-seam-partition={index}
            transform={`translate(0 ${index === 0 ? -28 * motion.ramp(frame, 36, motion.scale(36)) : -28 * (1 - motion.ramp(frame, 72, motion.scale(36)))})`}
            opacity={
              index === 0
                ? 1 - motion.reveal(frame, 60)
                : motion.ramp(frame, 72, motion.scale(36))
            }
          >
            <PartitionOutlines input={input} index={index} accent={accent} />
          </g>
        );
      })}
    </g>
  );
}
