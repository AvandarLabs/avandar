import { prop } from "@avandar/utils";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getQuantitySegmentsFromValues } from "./getQuantitySegmentsFromValues";
import type { ReactNode } from "react";

type Props = {
  values: Array<{ value: number; color: string }>;
  denominator: number;
  x: number;
  y: number;
  width: number;
  height: number;
};
/** Draws proportional authored quantities against an explicit common whole. */
export function QuantityBand({
  values,
  denominator,
  x,
  y,
  width,
  height,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  if (
    ![x, y, width, height].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error("Quantity band dimensions must be positive and finite.");
  }
  const segments = getQuantitySegmentsFromValues({
    values: values.map(prop("value")),
    denominator,
  });
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={tokens.color.line}
      />
      {segments.map((segment, index) => {
        return (
          <rect
            key={index}
            x={x + segment.start * width}
            y={y}
            width={segment.fraction * width}
            height={height}
            fill={values[index].color}
          />
        );
      })}
    </g>
  );
}
