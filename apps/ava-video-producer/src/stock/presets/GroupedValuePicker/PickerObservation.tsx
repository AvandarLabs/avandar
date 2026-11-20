import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./GroupedValuePicker.schema";
import type { ReactNode } from "react";

type Props = { input: Input; index: number; frame: number; accent: string };
/** Frames each source tile takes to fade in. */
const TILE_FRAMES = 30;
const GRAPHEMES: Intl.Segmenter = new Intl.Segmenter("und", {
  granularity: "grapheme",
});
/**
 * Ordered source tile with literal identity, nullable value and selection edge.
 */
export function PickerObservation({
  input,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const observation = input.observations[index],
    x = 48 + index * 144;
  const selected = input.rule === "first" && index === 0 && frame >= 56;
  return (
    <g
      data-picker-observation={observation.id}
      opacity={ramp(
        frame,
        13 + index * motion.stagger.list,
        motion.scale(TILE_FRAMES),
        motion.reveal.easing,
      )}
    >
      <StockRect
        data-observation-tile={observation.id}
        x={x}
        y={160}
        width={144}
        height={132}
        fill={tokens.color.surface}
        stroke={selected ? accent : tokens.color.line}
        strokeWidth={scales.stroke(
          selected ? tokens.stroke.emphasis : tokens.stroke.hairline,
        )}
      />
      {Array.from(GRAPHEMES.segment(observation.id), ({ segment }) => {
        return segment;
      })
        .reduce<string[]>((lines, segment, graphemeIndex) => {
          const lineIndex = Math.floor(graphemeIndex / 6);
          lines[lineIndex] = `${lines[lineIndex] ?? ""}${segment}`;
          return lines;
        }, [])
        .map((line, lineIndex) => {
          return (
            <LiteralDataText
              key={lineIndex}
              value={line}
              x={x + 8}
              y={180 + lineIndex * 16}
            />
          );
        })}
      {observation.value === null ? (
        <LabelSlots labels={[["∅", x + 120, 180, 16, 12, 1]]} />
      ) : null}
      <LabelSlots
        labels={[
          [
            observation.value === null
              ? input.labels.missing
              : String(observation.value),
            x + 8,
            224,
            128,
            12,
            5,
          ],
        ]}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${x + 12} 315 H${x + 132} m-7 -5 l7 5 l-7 5`,
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.line}
      />
    </g>
  );
}
