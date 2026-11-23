import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getReferralLaneStateFromFrame } from "../getReferralLaneStateFromFrame";
import type { Input } from "../ReferralReturnAcknowledgement.schema";
import type { ReactNode } from "react";

type ParentProps = {
  referral: Input["referrals"][number];
  index: number;
  frame: number;
  input: Input;
  accent: string;
};

type Props = {
  referral: Readonly<ParentProps>["referral"];
  input: Readonly<ParentProps>["input"];
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  y: ReturnType<typeof getReferralLaneStateFromFrame>["y"];
  returned: ReturnType<typeof getReferralLaneStateFromFrame>["returned"];
  receiptX: ReturnType<typeof getReferralLaneStateFromFrame>["receiptX"];
};

/** Renders the returned referral receipt in authored paint order. */
export function ReturnedReferralReceipt(options: Readonly<Props>): ReactNode {
  return (
    <>
      {options.returned ? (
        <rect
          data-return-id={options.referral.id}
          x={options.receiptX}
          y={options.y + 4}
          width={25}
          height={16}
          rx={options.scales.corner(2)}
          fill={
            options.input.emphasis === "return-message"
              ? options.accent
              : options.tokens.color.accentAlt
          }
        />
      ) : undefined}
    </>
  );
}
