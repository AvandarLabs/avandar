import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../GisLayerIntersectionTally.schema";
import type { LayerGeometryBuildPathCallable } from "../LayerGeometry";
import type { useId, ReactNode } from "react";

type Props = {
  input: Input;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  frame: number;
  identity: ReturnType<ReturnType<typeof useId>["replaceAll"]>;
  isIntersection: boolean;
  first: ReturnType<LayerGeometryBuildPathCallable>;
  accent: string;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  second: ReturnType<LayerGeometryBuildPathCallable>;
};

/** Renders the result geometry with authored geometry. */
export function LayerGeometryResultGeometry({
  input,
  motion,
  frame,
  identity,
  isIntersection,
  first,
  accent,
  scales,
  tokens,
  second,
}: Readonly<Props>): ReactNode {
  return (
    <g
      data-result-geometry={input.operation}
      opacity={motion.reveal(frame, 72)}
      clipPath={`url(#${identity}-a)`}
    >
      <g
        clipPath={isIntersection ? `url(#${identity}-b)` : undefined}
        mask={isIntersection ? undefined : `url(#${identity}-outside)`}
      >
        <path d={first} fill={`url(#${identity}-hatch)`} />
        <g
          data-result-boundary={input.operation}
          fill="none"
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.heavy)}
        >
          <path d={first} />
          <path d={second} />
        </g>
      </g>
    </g>
  );
}
