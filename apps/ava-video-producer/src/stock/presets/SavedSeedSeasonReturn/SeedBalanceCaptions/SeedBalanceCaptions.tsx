import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { getSeedBalanceCaptionsLayout } from "./getSeedBalanceCaptionsLayout";
import type { getSeedSceneFromFrame } from "../getSeedSceneFromFrame";
import type { Input } from "../SavedSeedSeasonReturn.schema.ts";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  scene: ReturnType<typeof getSeedSceneFromFrame>;
  frame: number;
};
/**
 * Final accounting replaces the reserved subtotal with the unsown remainder.
 */
export function SeedBalanceCaptions(props: Readonly<Props>): ReactNode {
  const presentation = getSeedBalanceCaptionsLayout(props);

  return (
    <g>
      {presentation.names.map((name, index) => {
        return (
          <g key={index}>
            <LabelSlots labels={[[name, 48 + index * 230, 450, 200, 14, 4]]} />
            {props.input.showQuantities ? (
              <LabelSlots
                labels={[
                  [
                    `${presentation.values[index] / 100} ${props.input.crop.unitLabel}`,
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
        );
      })}
    </g>
  );
}
