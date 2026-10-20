import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import type { getSeedSceneFromFrame } from "./getSeedSceneFromFrame";
import type { Input } from "./SavedSeedSeasonReturn.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  scene: ReturnType<typeof getSeedSceneFromFrame>;
  frame: number;
};
/**
 * Final accounting replaces the reserved subtotal with the unsown remainder.
 */
export function SeedBalanceCaptions({
  input,
  scene,
  frame,
}: Readonly<Props>): ReactNode {
  const labels = input.balanceLabels;
  const values = [
    frame < 12 ? scene.harvest : scene.current,
    frame < 12
      ? 0
      : !scene.hasCompletedSowing
        ? scene.reserve - (frame >= 100 ? scene.loss : 0)
        : scene.remaining,
    frame < 100 ? 0 : scene.loss,
    scene.hasCompletedSowing ? scene.sown : 0,
  ];
  const names = [
    frame < 12 ? input.crop.label : labels.currentUse,
    !scene.hasCompletedSowing ? labels.reserved : labels.remaining,
    labels.storageLoss,
    labels.sown,
  ];
  return (
    <g>
      {names.map((name, index) => (
        <g key={index}>
          <LabelSlots labels={[[name, 48 + index * 230, 450, 200, 14, 4]]} />
          {input.showQuantities ? (
            <LabelSlots
              labels={[
                [
                  `${values[index] / 100} ${input.crop.unitLabel}`,
                  48 + index * 230,
                  535,
                  200,
                  14,
                  3,
                ],
              ]}
            />
          ) : undefined}
        </g>
      ))}
    </g>
  );
}
