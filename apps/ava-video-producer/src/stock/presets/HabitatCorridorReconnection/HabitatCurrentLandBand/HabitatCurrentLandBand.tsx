import { QuantityBand } from "../../../primitives/QuantityBand/QuantityBand";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../HabitatCorridorReconnection.schema";
import type { ReactNode } from "react";

type Props = {
  currentHabitat: number;
  accent: string;
  input: Input;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
};

/** Renders the quantity band with authored geometry. */
export function HabitatCurrentLandBand({
  currentHabitat,
  accent,
  input,
  tokens,
}: Readonly<Props>): ReactNode {
  return (
    <QuantityBand
      values={[
        { value: currentHabitat, color: accent },
        {
          value: input.landBoundaryHa - currentHabitat,
          color: tokens.color.line,
        },
      ]}
      denominator={input.landBoundaryHa}
      x={32}
      y={480}
      width={896}
      height={12}
    />
  );
}
