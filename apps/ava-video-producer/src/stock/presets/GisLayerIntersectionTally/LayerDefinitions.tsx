import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = {
  identity: string;
  first: string;
  second: string;
  accent: string;
};
/** Layer Definitions for the authored scene. */
export function LayerDefinitions({
  identity,
  first,
  second,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <defs>
      <clipPath id={`${identity}-a`}>
        <path d={first} />
      </clipPath>
      <clipPath id={`${identity}-b`}>
        <path d={second} />
      </clipPath>
      <mask
        id={`${identity}-outside`}
        maskUnits="userSpaceOnUse"
        x={30}
        y={140}
        width={520}
        height={350}
      >
        <rect x={30} y={140} width={520} height={350} fill="white" />
        <path d={second} fill="black" />
      </mask>
      <pattern
        id={`${identity}-hatch`}
        width={8}
        height={8}
        patternUnits="userSpaceOnUse"
      >
        <SketchedShape
          shape={{ kind: "path", d: "M0 8 L8 0" }}
          profile={tokens.sketch.shape}
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.outline)}
        />
      </pattern>
    </defs>
  );
}
