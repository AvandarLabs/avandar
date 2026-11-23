import { propEq } from "@avandar/utils";
import { Motion } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { StockRect } from "../../primitives/StockRect";
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
  const sorting = Motion.ramp({
      frame,
      at: SORT_CUE,
      dur: SORTED_CUE - SORT_CUE,
      easing: travel,
    }),
    y = 180 + index * 200;
  return (
    <g data-operation={operation.id}>
      <LabelSlots labels={[[operation.label, 50, y + 10, 245, 18, 3]]} />
      {_getRequestsFromInputAndFrame({
        input,
        operation,
        frame,
        accent,
        sorting,
        y,
        travel,
        motion,
        tokens,
        scales,
      })}
      {_getOriginalOrderFromOperation({ input, operation, y, atomic })}
    </g>
  );
}

/** The lifted request pose preserves the cue-to-cue strip sorting. */
function _getRequestPoseFromInputAndFrame({
  input,
  resourceId,
  requestIndex,
  sorting,
  frame,
  travel,
  motion,
}: Readonly<{
  input: Input;
  resourceId: string;
  requestIndex: number;
  sorting: number;
  frame: number;
  travel: ReturnType<
    typeof GraphicThemeHooks.useGraphicMotion
  >["travel"]["easing"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
}>): { resource: Input["resources"][number]; x: number; arc: number } {
  const canonicalIndex = input.resources.findIndex(propEq("id", resourceId)),
    resource = input.resources[canonicalIndex];
  const x = Motion.mix({
    t: sorting,
    from: 340 + requestIndex * 260,
    to: 340 + canonicalIndex * 260,
  });
  const arc =
    canonicalIndex !== requestIndex && requestIndex === 1
      ? 100 *
        Motion.ramp({
          frame,
          at: LIFT_CUE,
          dur: SORT_CUE - LIFT_CUE,
          easing: travel,
        }) *
        (1 -
          Motion.ramp({
            frame,
            at: SORTED_CUE,
            dur: motion.whip,
            easing: travel,
          }))
      : 0;
  return { resource, x, arc };
}
/** The authored requests retain their original SVG tiles and stable keys. */
function _getRequestsFromInputAndFrame({
  input,
  operation,
  frame,
  accent,
  sorting,
  y,
  travel,
  motion,
  tokens,
  scales,
}: Readonly<RequestLayerOptions>): ReactNode {
  return operation.requestedIds.map((resourceId, requestIndex) => {
    const { resource, x, arc } = _getRequestPoseFromInputAndFrame({
      input,
      resourceId,
      requestIndex,
      sorting,
      frame,
      travel,
      motion,
    });
    return _getRequestTileFromPose({
      resourceId,
      operation,
      resource,
      x,
      arc,
      y,
      sorting,
      accent,
      tokens,
      scales,
    });
  });
}
/** Optional original-order IDs remain at their authored row positions. */
function _getOriginalOrderFromOperation({
  input,
  operation,
  y,
  atomic,
}: Readonly<{
  input: Input;
  operation: Input["operations"][number];
  y: number;
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
}>): ReactNode {
  return input.showOriginalOrder ? (
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
  ) : null;
}

/** Each literal request keeps its keyed tile and original SVG contents. */
function _getRequestTileFromPose({
  resourceId,
  operation,
  resource,
  x,
  arc,
  y,
  sorting,
  accent,
  tokens,
  scales,
}: Readonly<RequestTileOptions>): ReactNode {
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
}
/** Geometry and theme values for one authored request tile. */
type RequestTileOptions = {
  resourceId: string;
  operation: Input["operations"][number];
  resource: Input["resources"][number];
  x: number;
  arc: number;
  y: number;
  sorting: number;
  accent: string;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};

/** Request strip inputs shared by its pose and literal tile renderers. */
type RequestLayerOptions = Omit<Props, "index"> & {
  sorting: number;
  y: number;
  travel: ReturnType<
    typeof GraphicThemeHooks.useGraphicMotion
  >["travel"]["easing"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};
