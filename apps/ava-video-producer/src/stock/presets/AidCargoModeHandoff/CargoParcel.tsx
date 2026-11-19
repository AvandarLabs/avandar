import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getCargoPositionFromInputAndFrame } from "./getCargoPositionFromInputAndFrame";
import type { Input } from "./AidCargoModeHandoff.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  parcelIndex: number;
  accent: string;
};
const SYMBOLS: { grain: string; blanket: string; tool: string } = {
  grain: "M-9 0 V-10 M-9 -3 L-14 -8 M-9 -6 L-4 -11",
  blanket: "M-14 -10 H-4 V0 H-14 Z M-11 -10 V0",
  tool: "M-13 0 L-4 -9 M-8 -12 L-1 -5",
};
/**
 * One parcel object with a persistent ordinal identity and handling support.
 */
export function CargoParcel({
  input,
  frame,
  parcelIndex,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const parcel = input.parcels[parcelIndex];
  const position = getCargoPositionFromInputAndFrame({
    motion,
    input,
    frame,
    parcelIndex,
  });
  return (
    <g>
      {position.mechanism ? (
        <g data-mechanism={position.mechanism}>
          <SketchedShape
            shape={{
              kind: "path",
              d:
                position.mechanism === "hoist"
                  ? `M${position.x} 175 V${position.y - 17}`
                  : `M${position.x - 20} ${position.y + 20} h40 l5 -10`,
            }}
            profile={tokens.sketch.shape}
            fill="none"
            stroke={tokens.color.inactive}
            strokeWidth={scales.stroke(tokens.stroke.default)}
          />
          {position.mechanism === "handcart" ? (
            <circle
              cx={position.x}
              cy={position.y + 25}
              r={4}
              fill={tokens.color.inactive}
            />
          ) : undefined}
        </g>
      ) : undefined}
      <g
        data-parcel={parcel.id}
        data-owner={position.owner}
        data-x={position.x}
        data-y={position.y}
        transform={`translate(${position.x} ${position.y})`}
      >
        <StockRect
          x={-18}
          y={-18}
          width={36}
          height={36}
          rx={scales.corner(tokens.corner.chip)}
          fill={tokens.color.surface}
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.default)}
        />
        <SketchedShape
          shape={{ kind: "path", d: SYMBOLS[parcel.symbol] }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={accent}
        />
        <text
          x={6}
          y={10}
          fontFamily={tokens.text.graphic.value.fontFamily}
          fontSize={tokens.text.graphic.value.fontSize}
          fill={tokens.color.text}
          textAnchor="middle"
        >
          {parcelIndex + 1}
        </text>
      </g>
    </g>
  );
}
