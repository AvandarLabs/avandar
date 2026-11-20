import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { buildZoneOutlineFromCells } from "./buildZoneOutlineFromCells";
import { getGroupingFromCells } from "./getGroupingFromCells";
import type { Input } from "./BoundaryRegroupingEffect.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Raised group seams leave the atomic grid fixed below them. */
export function GroupingSeams({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
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

/** The outline of every zone in one grouping of the grid. */
function PartitionOutlines({
  input,
  index,
  accent,
}: Readonly<{ input: Input; index: number; accent: string }>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return getGroupingFromCells({ input, index }).map((zone) => {
    return (
      <SketchedShape
        key={zone.id}
        shape={{
          kind: "path",
          d: buildZoneOutlineFromCells(zone.cells),
        }}
        profile={tokens.sketch.shape}
        data-zone-outline={zone.id}
        fill="none"
        stroke={
          [accent, tokens.color.accentAlt, tokens.color.highlight][
            zone.zoneIndex
          ]
        }
        strokeWidth={scales.stroke(tokens.stroke.heavy)}
      />
    );
  });
}
