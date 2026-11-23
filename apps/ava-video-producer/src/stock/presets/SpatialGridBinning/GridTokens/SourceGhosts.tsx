import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { makeGridSceneFromInputAndFrame } from "../makeGridSceneFromInputAndFrame";
import type { ReactNode } from "react";

type Props = {
  points: ReturnType<typeof makeGridSceneFromInputAndFrame>["points"];
};

/** A faint ghost at each point's source position. */
export function SourceGhosts({ points }: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const { color } = GraphicThemeHooks.useGraphicTokens();
  return points.map((point) => {
    return (
      <circle
        key={point.id}
        data-source-ghost={point.id}
        cx={point.sourceX}
        cy={point.sourceY}
        r={4}
        fill={color.inactive}
        opacity={atomic.opacity["35"]}
      />
    );
  });
}
