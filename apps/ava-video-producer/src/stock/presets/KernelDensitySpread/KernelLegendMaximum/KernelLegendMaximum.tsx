import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { KernelDensitySpread } from "../KernelDensitySpread";
import type { ReactNode } from "react";

type Props = {
  text: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["text"];
  data: ReturnType<
    typeof GraphicThemeHooks.useGraphicTokens
  >["text"]["graphic"]["data"];
  input: Parameters<typeof KernelDensitySpread>[0]["input"];
};

/** Renders the value label with authored geometry. */
export function KernelLegendMaximum({
  data,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <text
      x={890}
      y={325}
      fill={data.color}
      textAnchor="end"
      fontSize={data.fontSize}
      fontWeight={data.fontWeight}
    >
      {input.legendMaximum}
    </text>
  );
}
