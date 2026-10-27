import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SeedBalanceCaptions } from "./SeedBalanceCaptions";
import type { getSeedSceneFromFrame } from "./getSeedSceneFromFrame";
import type { Input } from "./SavedSeedSeasonReturn.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  scene: ReturnType<typeof getSeedSceneFromFrame>;
  frame: number;
};
/**
 * Authored factual status and choice stay visible across the seasonal interval.
 */
export function SeedCaptions({
  input,
  scene,
  frame,
}: Readonly<Props>): ReactNode {
  const season =
    frame < 49
      ? input.seasons.harvestLabel
      : frame < 101
        ? input.seasons.storageLabel
        : input.seasons.plantingLabel;
  return (
    <g>
      <LabelSlots
        labels={[
          [input.evidenceLabel, 48, 40, 864, 14, 2],
          [input.crop.label, 48, 85, 350, 16, 3],
          [input.crop.unitLabel, 445, 85, 180, 14, 3],
          [input.cultivator.label, 635, 85, 277, 14, 3],
          [input.cultivator.choiceLabel, 48, 151, 864, 16, 2],
          [season, 48, 204, 864, 16, 2],
        ]}
      />
      <SeedBalanceCaptions input={input} scene={scene} frame={frame} />
    </g>
  );
}
