import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect";
import { CargoParcelOrdinal } from "../CargoParcelOrdinal/CargoParcelOrdinal";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../AidCargoModeHandoff.schema";
import type { CargoParcelSymbolsValue } from "../CargoParcel";
import type { getCargoPositionFromInputAndFrame } from "../getCargoPositionFromInputAndFrame";
import type { ReactNode } from "react";

type Props = {
  parcel: Input["parcels"][number];
  position: ReturnType<typeof getCargoPositionFromInputAndFrame>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  accent: string;
  symbols: CargoParcelSymbolsValue;
  parcelIndex: number;
};

/** Renders the parcel with authored geometry. */
export function CargoParcelBody({
  parcel,
  position,
  scales,
  tokens,
  accent,
  symbols: SYMBOLS,
  parcelIndex,
}: Readonly<Props>): ReactNode {
  return (
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
      <CargoParcelOrdinal tokens={tokens} parcelIndex={parcelIndex} />
    </g>
  );
}
