import { getSeedSceneFromFrame } from "./getSeedSceneFromFrame";
import { SeedCaptions } from "./SeedCaptions";
import { SeedContainers } from "./SeedContainers";
import { SeedCultivator } from "./SeedCultivator";
import { SeedMaterial } from "./SeedMaterial";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./SavedSeedSeasonReturn.schema";
import type { ReactNode } from "react";
type Props = GraphicProps & { input: Input };
/**
 * A retained seed lot crosses a fallow interval and stops at authored sowing.
 */
export function SavedSeedSeasonReturn({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const scene = getSeedSceneFromFrame({ input, frame });
  return (
    <g>
      <SeedContainers scene={scene} frame={frame} accent={accent} />
      <SeedMaterial scene={scene} frame={frame} accent={accent} />
      <SeedCultivator
        input={input}
        scene={scene}
        frame={frame}
        accent={accent}
      />
      <path
        data-crop-symbol={input.crop.symbol}
        d={
          input.crop.symbol === "bean"
            ? "M422 82 C402 80 402 102 414 100 C430 98 414 89 422 82 Z"
            : "M414 80 V102 M414 88 l-8 -6 M414 94 l8 -8"
        }
        fill="none"
        stroke={accent}
        strokeWidth={2}
      />
      <SeedCaptions input={input} scene={scene} frame={frame} />
    </g>
  );
}
