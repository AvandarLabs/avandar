import { STOCK } from "../../stockPalette";
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
  return (
    <g>
      <path
        data-harvest-mat=""
        d="M48 400 H238 M48 405 H238"
        stroke={STOCK.muted}
        strokeWidth={3}
      />
      <path
        data-seed-jar=""
        d="M278 290 V410 H478 V290"
        fill="none"
        stroke={STOCK.muted}
        strokeWidth={3}
      />
      <rect
        data-jar-lid=""
        x={278}
        y={286 - scene.lidOpen * 36}
        width={200}
        height={5}
        fill={STOCK.muted}
      />
      <path
        data-loss-tray=""
        d="M508 390 V410 H708 V390"
        fill="none"
        stroke={STOCK.muted}
        strokeWidth={3}
      />
      <SeedPlot scene={scene} frame={frame} accent={accent} />
    </g>
  );
}
