import { mix, ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./ChosenServiceAccess.schema";
import type { ReactNode } from "react";

type Props = {
  service: Input["services"][number];
  input: Input;
  index: number;
  frame: number;
  accent: string;
};
/** The selected service alone unfolds a ramp or rolls an obstruction clear. */
export function ServiceEntrance({
  service,
  input,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const x = 160 + ((index + 0.5) * 640) / input.services.length;
  const selected = service.id === input.chosenServiceId;
  const change = selected
    ? motion.ramp(frame, 44, motion.scale(32), motion.travel.easing)
    : 0;
  const threshold = input.accessChange === "clear-entrance" ? 356 : 326;
  const barrier =
    input.accessChange === "unfold-ramp"
      ? `M${x - 42} 326 L${x - 42 - 58 * change} ${mix(change, 246, 356)}`
      : `M${x - 30 + change * 94} 356 h60 v-38 h-60 Z`;
  return (
    <g>
      <FitText
        text={service.label}
        x={x}
        y={118}
        width={input.services.length === 3 ? 204 : 280}
        fontSize={14}
        maxLines={3}
        anchor="middle"
        breakLongWords
        normalizeWhitespace
      />
      <StockRect
        x={x - 68}
        y={194}
        width={136}
        height={threshold - 180}
        rx={scales.corner(tokens.corner.cell)}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${x - 42} ${threshold} V214 H${x + 42} V${threshold}`,
        }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.inactive}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        fill="none"
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${x + 42} 214 L${x + 42 - 68 * (1 - change)} ${214 + change * 10} V${threshold} H${x + 42}`,
        }}
        profile={tokens.sketch.shape}
        data-door={service.id}
        fill={tokens.color.surface}
        stroke={selected ? accent : tokens.color.inactive}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d:
            input.accessChange === "unfold-ramp"
              ? `M${x - 42} 356 V326 H${x + 42}`
              : `M${x - 42} 356 H${x + 42}`,
        }}
        profile={tokens.sketch.shape}
        data-threshold={service.id}
        fill="none"
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <SketchedShape
        shape={{ kind: "path", d: barrier }}
        profile={tokens.sketch.shape}
        data-barrier={service.id}
        data-barrier-selected={selected}
        fill={
          input.accessChange === "unfold-ramp" ? "none" : tokens.color.surface
        }
        stroke={selected ? accent : tokens.color.highlight}
        strokeWidth={scales.stroke(5)}
      />
      {service.symbol === "shelter" ? (
        <SketchedShape
          shape={{ kind: "path", d: `M${x - 18} 184 L${x} 168 L${x + 18} 184` }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={tokens.color.inactive}
        />
      ) : service.symbol === "water" ? (
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${x} 163 Q${x - 20} 187 ${x} 190 Q${x + 20} 187 ${x} 163`,
          }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={tokens.color.inactive}
        />
      ) : (
        <g fill={tokens.color.inactive}>
          <circle cx={x} cy={171} r={2} />
          <rect x={x - 1} y={178} width={2} height={12} />
        </g>
      )}
      {selected && input.showChoiceLabel && frame >= 30 ? (
        <g data-choice-label>
          <FitText
            text={input.labels.choice}
            x={x}
            y={50}
            width={260}
            fontSize={14}
            maxLines={3}
            anchor="middle"
            breakLongWords
            normalizeWhitespace
          />
        </g>
      ) : undefined}
    </g>
  );
}
