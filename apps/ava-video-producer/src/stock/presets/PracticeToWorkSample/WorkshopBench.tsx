import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { transfer: number };
/** Workshop Bench for the authored scene. */
export function WorkshopBench({ transfer }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g
      data-workshop-bench="true"
      transform={`translate(${mix(transfer, 640, 570)} 388)`}
      opacity={transfer}
    >
      <SketchedShape
        shape={{
          kind: "path",
          d: "M0 0 H260 M20 0 V105 M240 0 V105 M20 65 H240",
        }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(7)}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M235 -16 V16 H218" }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(6)}
      />
    </g>
  );
}
