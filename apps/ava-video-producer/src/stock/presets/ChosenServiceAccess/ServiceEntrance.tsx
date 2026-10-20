import { EASE, mix, ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
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
  const x = 160 + ((index + 0.5) * 640) / input.services.length;
  const selected = service.id === input.chosenServiceId;
  const change = selected ? ramp(frame, 44, 32, EASE.inOut) : 0;
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
      <rect
        x={x - 68}
        y={194}
        width={136}
        height={threshold - 180}
        rx={8}
        fill={STOCK.surface}
        stroke={STOCK.line}
      />
      <path
        d={`M${x - 42} ${threshold} V214 H${x + 42} V${threshold}`}
        stroke={STOCK.muted}
        strokeWidth={3}
        fill="none"
      />
      <path
        data-door={service.id}
        d={`M${x + 42} 214 L${x + 42 - 68 * (1 - change)} ${214 + change * 10} V${threshold} H${x + 42}`}
        fill={STOCK.surface}
        stroke={selected ? accent : STOCK.muted}
      />
      <path
        data-threshold={service.id}
        d={
          input.accessChange === "unfold-ramp"
            ? `M${x - 42} 356 V326 H${x + 42}`
            : `M${x - 42} 356 H${x + 42}`
        }
        fill="none"
        stroke={STOCK.line}
        strokeWidth={3}
      />
      <path
        data-barrier={service.id}
        data-barrier-selected={selected}
        d={barrier}
        fill={input.accessChange === "unfold-ramp" ? "none" : STOCK.surface}
        stroke={selected ? accent : STOCK.orange}
        strokeWidth={5}
      />
      {service.symbol === "shelter" ? (
        <path
          d={`M${x - 18} 184 L${x} 168 L${x + 18} 184`}
          fill="none"
          stroke={STOCK.muted}
        />
      ) : service.symbol === "water" ? (
        <path
          d={`M${x} 163 Q${x - 20} 187 ${x} 190 Q${x + 20} 187 ${x} 163`}
          fill="none"
          stroke={STOCK.muted}
        />
      ) : (
        <g fill={STOCK.muted}>
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
