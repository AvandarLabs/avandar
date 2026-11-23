import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { DisclosedMarker } from "./DisclosedMarker";
import { PublicDisplacementMapApproximateLabel } from "./PublicDisplacementMapApproximateLabel/PublicDisplacementMapApproximateLabel";
import type { Input } from "./BoundedLocationDisplacement.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** An initially empty public map receives only approximate displaced marks. */
export function PublicDisplacementMap({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <g data-display-map="">
      <StockRect
        x={485}
        y={174}
        width={410}
        height={245}
        fill="none"
        stroke={tokens.color.line}
      />
      {frame >= 71
        ? input.locations.map((location, index) => {
            return (
              <DisclosedMarker
                key={location.id}
                {...{ location, index, frame, accent }}
              />
            );
          })
        : undefined}
      <PublicDisplacementMapApproximateLabel input={input} />
    </g>
  );
}
