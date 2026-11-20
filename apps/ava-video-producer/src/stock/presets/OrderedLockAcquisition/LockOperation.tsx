import { mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { TILE_CORNER } from "./lockShape";
import type { Input } from "./OrderedLockAcquisition.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  input: Input;
  operation: Input["operations"][number];
  index: number;
  accent: string;
};
/** The cue an out-of-order request starts to lift out of its strip on. */
const LIFT_CUE = 53;
/** The cue the request strips start to sort on, once lifted. */
const SORT_CUE = 61;
/** The cue the strips are sorted and the lifted request drops back on. */
const SORTED_CUE = 82;
/** Request strips sort geometrically before either operation acquires a key. */
export function LockOperation({
  frame,
  input,
  operation,
  index,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const travel = motion.travel.easing;
  // The strips sort between the lift and the drop, cue to cue.
  const sorting = ramp(frame, SORT_CUE, SORTED_CUE - SORT_CUE, travel),
    y = 180 + index * 200;
  return (
    <g data-operation={operation.id}>
      <LabelSlots labels={[[operation.label, 50, y + 10, 245, 18, 3]]} />
      {operation.requestedIds.map((resourceId, requestIndex) => {
        const canonicalIndex = input.resources.findIndex(({ id }) => {
            return id === resourceId;
          }),
          resource = input.resources[canonicalIndex];
        const x = mix(
          sorting,
          340 + requestIndex * 260,
          340 + canonicalIndex * 260,
        );
        const arc =
          canonicalIndex !== requestIndex && requestIndex === 1
            ? 100 *
              ramp(frame, LIFT_CUE, SORT_CUE - LIFT_CUE, travel) *
              (1 - ramp(frame, SORTED_CUE, motion.whip, travel))
            : 0;
        return (
          <g
            key={resourceId}
            data-request-resource={resourceId}
            data-request-operation={operation.id}
          >
            <StockRect
              data-request-tile={resourceId}
              x={x}
              y={y + arc}
              width={200}
              height={94}
              rx={scales.corner(TILE_CORNER)}
              fill={tokens.color.surface}
              stroke={sorting === 1 ? accent : tokens.color.line}
            />
            <LabelSlots
              labels={[[resource.label, x + 12, y + 20 + arc, 176, 14, 3]]}
            />
            <LiteralDataText value={resourceId} x={x + 12} y={y + 82 + arc} />
          </g>
        );
      })}
      {input.showOriginalOrder ? (
        <g
          opacity={atomic.opacity["45"]}
          data-original-order={operation.requestedIds.join(",")}
        >
          {operation.requestedIds.map((resourceId, requestIndex) => {
            return (
              <LiteralDataText
                key={resourceId}
                value={resourceId}
                x={50}
                y={y + 100 + requestIndex * 26}
              />
            );
          })}
        </g>
      ) : null}
    </g>
  );
}
