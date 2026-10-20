import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { getSeedSceneFromFrame } from "./getSeedSceneFromFrame";
import type { ReactNode } from "react";
type Props = {
  scene: ReturnType<typeof getSeedSceneFromFrame>;
  frame: number;
  accent: string;
};
/**
 * One plot turns fallow and accepts sowing without an inferred plant or yield.
 */
export function SeedPlot({ scene, frame, accent }: Readonly<Props>): ReactNode {
  return (
    <g>
      {" "}
      <rect
        data-same-plot=""
        x={728}
        y={320}
        width={200}
        height={90}
        rx={12}
        fill={STOCK.surface}
        stroke={STOCK.muted}
      />
      <path
        data-stubble=""
        d="M750 360 v-16 m40 16 v-16 m40 16 v-16 m40 16 v-16 m40 16 v-16"
        stroke={STOCK.orange}
        opacity={1 - ramp(frame, 49, 51)}
        fill="none"
      />
      {scene.sown > 0 ? (
        <line
          data-furrow=""
          x1={738}
          y1={399}
          x2={738 + 180 * ramp(frame, 108, 8)}
          y2={399}
          stroke={accent}
          strokeWidth={2}
        />
      ) : undefined}
    </g>
  );
}
