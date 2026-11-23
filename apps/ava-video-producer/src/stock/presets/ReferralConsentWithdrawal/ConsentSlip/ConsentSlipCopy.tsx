import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import type { useConsentSlipPresentation } from "./useConsentSlipPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useConsentSlipPresentation>,
  "turn" | "permission" | "y" | "input"
>;
/** Render the consent slip copy. */
export function ConsentSlipCopy(props: Readonly<Props>): ReactNode {
  return (
    <g opacity={Math.abs(2 * props.turn - 1)}>
      <LabelSlots
        labels={[
          [props.permission.recipient, 58, props.y + 18, 440, 12, 1],
          [
            props.turn > 0.5
              ? props.input.labels.withdrawn
              : props.input.labels.permitted,
            58,
            props.y + 76,
            440,
            12,
            1,
          ],
        ]}
      />
      {props.input.showPurpose ? (
        <LabelSlots
          labels={[[props.permission.purpose, 58, props.y + 49, 440, 12, 1]]}
        />
      ) : undefined}
    </g>
  );
}
