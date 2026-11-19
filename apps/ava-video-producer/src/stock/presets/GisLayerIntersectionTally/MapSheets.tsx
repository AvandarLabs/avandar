import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return [first, second].map((path, index) => {
    return (
      <g
        key={index}
        data-map-layer={input.layers[index].id}
        transform={`translate(${mix(registration, index ? 24 : -24, 0)} ${mix(registration, index ? -18 : 18, 0)})`}
      >
        <SketchedShape
          shape={{ kind: "path", d: path }}
          profile={tokens.sketch.shape}
          fill={index ? tokens.color.positive : tokens.color.accentAlt}
          fillOpacity={scales.wash(tokens.alpha.tint)}
          stroke={index ? tokens.color.positive : tokens.color.accentAlt}
          strokeWidth={scales.stroke(tokens.stroke.outline)}
          strokeOpacity={input.showLayerOutlines || frame < 108 ? 1 : 0}
        />
      </g>
    );
  });
}
