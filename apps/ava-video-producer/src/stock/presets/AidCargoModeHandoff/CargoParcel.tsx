import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CargoParcelBody } from "./CargoParcelBody/CargoParcelBody";
import { CargoParcelMechanism } from "./CargoParcelMechanism/CargoParcelMechanism";
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
  const motion = GraphicThemeHooks.useGraphicMotion();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const parcel = input.parcels[parcelIndex];
  const position = getCargoPositionFromInputAndFrame({
    motion,
    input,
    frame,
    parcelIndex,
  });
  return (
    <g>
      <CargoParcelMechanism {...{ position, tokens, scales }} />
      <CargoParcelBody
        {...{ parcel, position, scales, tokens, accent }}
        symbols={SYMBOLS}
        parcelIndex={parcelIndex}
      />
    </g>
  );
}
/** The type of `SYMBOLS` used by CargoParcel. */
export type CargoParcelSymbolsValue = typeof SYMBOLS;
