import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { SeedPlot } from "./SeedPlot";
import type { getSeedSceneFromFrame } from "./getSeedSceneFromFrame";
import type { ReactNode } from "react";

type Props = {
  scene: ReturnType<typeof getSeedSceneFromFrame>;
  frame: number;
  accent: string;
};
/**
 * Stable mat, open-rim jar, loss tray and same fallow plot receive the seed
 * lot.
 */
export function SeedContainers({
  scene,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g>
      <g data-harvest-mat="">
        <SketchedShape
          shape={{ kind: "path", d: "M48 400 H238 M48 405 H238" }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.inactive}
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        />
      </g>
      <g data-seed-jar="">
        <OpenContainer d="M278 290 V410 H478 V290" />
      </g>
      <rect
        data-jar-lid=""
        x={278}
        y={286 - scene.lidOpen * 36}
        width={200}
        height={5}
        fill={tokens.color.inactive}
      />
      <g data-loss-tray="">
        <OpenContainer d="M508 390 V410 H708 V390" />
      </g>
      <SeedPlot scene={scene} frame={frame} accent={accent} />
    </g>
  );
}

/** An open-topped container's outline. */
function OpenContainer({ d }: Readonly<{ d: string }>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <SketchedShape
      shape={{ kind: "path", d }}
      profile={tokens.sketch.shape}
      fill="none"
      stroke={tokens.color.inactive}
      strokeWidth={scales.stroke(tokens.stroke.emphasis)}
    />
  );
}
