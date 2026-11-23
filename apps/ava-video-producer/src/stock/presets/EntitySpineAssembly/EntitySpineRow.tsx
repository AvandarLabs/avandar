import { propEq } from "@avandar/utils";
import { Motion } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { EntitySpineRowLabels } from "./EntitySpineRowLabels/EntitySpineRowLabels";
import type { Input } from "./EntitySpineAssembly.schema";
import type { ReactNode } from "react";

type SpineRowAttachment = {
  value: number | null;
  y: number;
  attachment: number;
  x: number;
};

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

type GetSpineRowAttachmentOptions = {
  input: Input;
  entity: Input["entities"][number];
  index: number;
  frame: number;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};
/** Samples the authored spine row attachment. */
function _getSpineRowAttachment({
  input,
  entity,
  index,
  frame,
  motion,
}: Readonly<GetSpineRowAttachmentOptions>): SpineRowAttachment {
  const rows = input.observations.filter(propEq("entityId", entity.id));
  const value = rows.length
    ? rows.reduce((sum, row) => {
        return sum + row.value;
      }, 0)
    : null;
  const y = 120 + index * 100,
    // A missing value attaches as the summed values land, at 139.
    attachment = Motion.ramp({
      frame,
      at: 106,
      dur: 139 - 106,
      easing: motion.travel.easing,
    });
  const x = Motion.mix({
    t: Motion.ramp({
      frame,
      at: 13,
      dur: motion.scale(ALIGN_FRAMES),
      easing: motion.travel.easing,
    }),
    from: 495 + index * 12,
    to: 460,
  });
  return { value, y, attachment, x };
}

/** One spine row receives a nullable aggregate without changing membership. */
export function EntitySpineRow({
  input,
  entity,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { value, y, attachment, x } = _getSpineRowAttachment({
    input,
    entity,
    index,
    frame,
    motion,
  });
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
      <EntitySpineRowLabels {...{ value, attachment, frame, input, y }} />
    </g>
  );
}
