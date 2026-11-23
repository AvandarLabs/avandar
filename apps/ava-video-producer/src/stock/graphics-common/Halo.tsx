import { GraphicThemeHooks } from "../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  cx: number;
  cy: number;
  r: number;
  color: string;
};
/** The theme's soft disc around a point, such as a packet's halo. */
export function Halo({ cx, cy, r, color }: Readonly<Props>): ReactNode {
  const { glow } = GraphicThemeHooks.useGraphicProps({
    name: "Halo",
    props: {},
  });
  const filter = GraphicThemeHooks.useGraphicFilter("components.Halo.glow");
  return (
    <circle
      filter={filter}
      cx={cx}
      cy={cy}
      r={r + glow.spread}
      fill={color}
      fillOpacity={glow.opacity}
    />
  );
}
