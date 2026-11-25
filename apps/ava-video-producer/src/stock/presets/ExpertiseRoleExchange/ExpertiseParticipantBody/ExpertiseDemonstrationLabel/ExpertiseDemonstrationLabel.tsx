import { LabelSlots } from "../../../../primitives/LabelSlots/LabelSlots";
import { DEMONSTRATE_CUE } from "../../exchangeTiming";
import type { GraphicThemeHooks } from "../../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../../ExpertiseRoleExchange.schema";
import type { ReactNode } from "react";

type Props = {
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  frame: number;
  index: number;
  input: Input;
  isExpert: boolean;
};
/** Identifies the active demonstration or learning role. */
export function ExpertiseDemonstrationLabel({
  motion,
  frame,
  index,
  input,
  isExpert,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <g opacity={motion.reveal(frame, DEMONSTRATE_CUE)}>
        <LabelSlots
          labels={[
            [
              isExpert ? input.labels.demonstrates : input.labels.learns,
              index === 0 ? 60 : 680,
              360,
              220,
              14,
              4,
            ],
          ]}
        />
      </g>
    </>
  );
}
