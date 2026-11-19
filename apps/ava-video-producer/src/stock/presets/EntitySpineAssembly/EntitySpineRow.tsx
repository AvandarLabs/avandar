import { mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./EntitySpineAssembly.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  entity: Input["entities"][number];
  index: number;
  frame: number;
  accent: string;
};

/** Frames the spine rows take to slide into their column. */
const ALIGN_FRAMES = 35;
/** A spine row's corner before the corner style scales it. */
const ROW_CORNER = 6;
/** One spine row receives a nullable aggregate without changing membership. */
export function EntitySpineRow({
  input,
  entity,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const rows = input.observations.filter(({ entityId }) => {
    return entityId === entity.id;
  });
  const value = rows.length
    ? rows.reduce((sum, row) => {
        return sum + row.value;
      }, 0)
    : null;
  const y = 120 + index * 100,
    // A missing value attaches as the summed values land, at 139.
    attachment = ramp(frame, 106, 139 - 106, motion.travel.easing);
  const x = mix(
    ramp(frame, 13, motion.scale(ALIGN_FRAMES), motion.travel.easing),
    495 + index * 12,
    460,
  );
  return (
    <g
      data-entity-row={entity.id}
      data-value={attachment === 1 ? String(value) : "pending"}
    >
      <StockRect
        data-spine-body={entity.id}
        x={x}
        y={y}
        width={440}
        height={84}
        rx={scales.corner(ROW_CORNER)}
        fill={tokens.color.surface}
        stroke={accent}
      />
      <LabelSlots labels={[[entity.label, x + 15, y + 18, 200, 14, 3]]} />
      <LiteralDataText value={entity.id} x={x + 15} y={y + 75} />
      <g
        opacity={value === null ? attachment : frame >= 139 ? 1 : 0}
        transform={`translate(${value === null ? mix(attachment, 30, 0) : 0} 0)`}
      >
        <LabelSlots
          labels={[
            [
              value === null ? input.field.missingLabel : String(value),
              690,
              y + 18,
              195,
              14,
              4,
            ],
          ]}
        />
      </g>
    </g>
  );
}
