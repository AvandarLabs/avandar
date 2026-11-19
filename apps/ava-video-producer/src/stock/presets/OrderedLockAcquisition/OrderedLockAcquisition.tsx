import { prop } from "@avandar/utils";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getLockStateFromFrame } from "./getLockStateFromFrame";
import { LockOperation } from "./LockOperation";
import { TILE_CORNER } from "./lockShape";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./OrderedLockAcquisition.schema";
import type { ReactNode } from "react";
/** Frame-driven authored study props. */
export type Props = GraphicProps & { input: Input };

/** The dash of an operation's first reach toward a key. */
const REACH_DASH = "5 7";
/** How faint the first reaches are. */
const REACH_OPACITY = 0.65;
/** Opposite request strips become a single exclusive acquisition sequence. */
export function OrderedLockAcquisition({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  return (
    <g data-canonical-order={input.resources.map(prop("id")).join(",")}>
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
      {input.resources.map((resource, index) => {
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
            <LiteralDataText
              value={resource.id}
              x={350 + index * 260}
              y={128}
            />
          </g>
        );
      })}
      {frame < 53
        ? input.operations.map((operation, index) => {
            const resourceIndex = input.resources.findIndex(({ id }) => {
              return id === operation.requestedIds[0];
            });
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
                  strokeDasharray={REACH_DASH}
                  opacity={REACH_OPACITY}
                />
              </g>
            );
          })
        : null}
      {input.operations.map((operation, index) => {
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
      })}
      {input.resources.map((resource, resourceIndex) => {
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
      })}
    </g>
  );
}
