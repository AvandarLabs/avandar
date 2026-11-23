import { QuantityBand } from "../../../primitives/QuantityBand/QuantityBand";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../HabitatCorridorReconnection.schema";
import type { ReactNode } from "react";

type Props = {
  habitat: number;
  accent: string;
  other: number;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  input: Input;
};

/** Renders the quantity band habitat with authored geometry. */
export function HabitatOriginalLandBand({
  habitat,
  accent,
  other,
  tokens,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <QuantityBand
      values={[
        { value: habitat, color: accent },
        { value: other, color: tokens.color.line },
      ]}
      denominator={input.landBoundaryHa}
      x={32}
      y={456}
      width={896}
      height={12}
    />
  );
}
