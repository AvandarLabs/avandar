import { mix } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { Input } from "./GisLayerIntersectionTally.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  first: string;
  second: string;
  registration: number;
  frame: number;
};
/** Map Sheets for the authored scene. */
export function MapSheets({
  input,
  first,
  second,
  registration,
  frame,
}: Readonly<Props>): ReactNode {
  return [first, second].map((path, index) => (
    <g
      key={index}
      data-map-layer={input.layers[index].id}
      transform={`translate(${mix(registration, index ? 24 : -24, 0)} ${mix(registration, index ? -18 : 18, 0)})`}
    >
      <path
        d={path}
        fill={index ? STOCK.mint : STOCK.cyan}
        fillOpacity={0.12}
        stroke={index ? STOCK.mint : STOCK.cyan}
        strokeWidth={1.5}
        strokeOpacity={input.showLayerOutlines || frame < 108 ? 1 : 0}
      />
    </g>
  ));
}
