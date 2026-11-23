import { prop, propEq } from "@avandar/utils";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getLockStateFromFrame } from "./getLockStateFromFrame";
import { LockOperation } from "./LockOperation";
import { TILE_CORNER } from "./lockShape";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./OrderedLockAcquisition.schema";
import type { ReactNode } from "react";
/** Frame-driven authored study props. */
export type Props = GraphicProps & { input: Input };
/** Opposite request strips become a single exclusive acquisition sequence. */
export function OrderedLockAcquisition({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g data-canonical-order={input.resources.map(prop("id")).join(",")}>
      {_getLockLabelsFromInputAndFrame({ input, frame })}
      {_getResourceLayerFromInputAndTheme({ input, tokens, scales })}
      {frame < 53
        ? _getReachesFromInputAndTheme({ input, tokens, atomic })
        : null}
      {_getOperationsFromInputAndFrame({ input, frame, accent })}
      {_getKeysFromInputAndFrame({
        input,
        frame,
        accent,
        tokens,
        scales,
        motion,
      })}
    </g>
  );
}

/** The before/after heading and fixed study context. */
function _getLockLabelsFromInputAndFrame({
  input,
  frame,
}: Readonly<Pick<Props, "input" | "frame">>): ReactNode {
  return (
    <LabelSlots
      labels={[
        [
          frame >= 140 ? input.copy.after : input.copy.before,
          50,
          30,
          850,
          14,
          1,
        ],
        [input.copy.context, 50, 595, 850, 14, 1],
      ]}
    />
  );
}
/**
 * Authored resources retain their exact labels, identity, and tray geometry.
 */
function _getResourceLayerFromInputAndTheme({
  input,
  tokens,
  scales,
}: Readonly<{
  input: Input;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
}>): ReactNode {
  return input.resources.map((resource, index) => {
    return (
      <g key={resource.id}>
        <StockRect
          x={340 + index * 260}
          y={55}
          width={240}
          height={84}
          rx={scales.corner(TILE_CORNER)}
          fill={tokens.color.elevated}
          stroke={tokens.color.line}
        />
        <LabelSlots
          labels={[[resource.label, 350 + index * 260, 72, 190, 14, 3]]}
        />
        <LiteralDataText value={resource.id} x={350 + index * 260} y={128} />
      </g>
    );
  });
}
/** Early reach marks retain the authored first requested resource. */
function _getReachesFromInputAndTheme({
  input,
  tokens,
  atomic,
}: Readonly<{
  input: Input;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
}>): ReactNode {
  return input.operations.map((operation, index) => {
    const resourceIndex = input.resources.findIndex(
      propEq("id", operation.requestedIds[0]),
    );
    return (
      <g key={operation.id} data-reach={operation.id}>
        <SketchedShape
          shape={{
            kind: "path",
            d: `M300 ${205 + index * 200} L${560 + resourceIndex * 260} 145`,
          }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={tokens.color.highlight}
          strokeDasharray={atomic.dash.boundary.join(" ")}
          opacity={atomic.opacity["65"]}
        />
      </g>
    );
  });
}
/** Each authored operation keeps its original identity and index. */
function _getOperationsFromInputAndFrame({
  input,
  frame,
  accent,
}: Readonly<Pick<Props, "input" | "frame" | "accent">>): ReactNode {
  return input.operations.map((operation, index) => {
    return (
      <LockOperation
        key={operation.id}
        frame={frame}
        input={input}
        operation={operation}
        index={index}
        accent={accent}
      />
    );
  });
}
/** Exclusive keys follow their authored ownership and motion. */
function _getKeysFromInputAndFrame({
  input,
  frame,
  accent,
  tokens,
  scales,
  motion,
}: Readonly<
  Pick<Props, "input" | "frame" | "accent"> & {
    tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
    scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
    motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  }
>): ReactNode {
  return input.resources.map((resource, resourceIndex) => {
    const state = getLockStateFromFrame({
      frame,
      input,
      resourceIndex,
      motion,
    });
    return (
      <g
        key={resource.id}
        data-lock-key={resource.id}
        data-key-owner={state.owner}
      >
        <SketchedShape
          shape={{ kind: "circle", cx: state.x, cy: state.y, r: 11 }}
          profile={tokens.sketch.shape}
          fill={state.owner ? accent : tokens.color.accentAlt}
          stroke={tokens.color.text}
          strokeWidth={scales.stroke(tokens.stroke.default)}
        />
      </g>
    );
  });
}
