import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  text: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["text"];
  data: ReturnType<
    typeof GraphicThemeHooks.useGraphicTokens
  >["text"]["graphic"]["data"];
};

/** Renders the value label text with authored geometry. */
export function KernelLegendMinimum({ data }: Readonly<Props>): ReactNode {
  return (
    <text
      x={610}
      y={325}
      fill={data.color}
      fontSize={data.fontSize}
      fontWeight={data.fontWeight}
    >
      0
    </text>
  );
}
