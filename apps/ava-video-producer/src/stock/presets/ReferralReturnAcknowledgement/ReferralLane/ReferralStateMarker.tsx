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
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  y: ReturnType<typeof getReferralLaneStateFromFrame>["y"];
  state: ReturnType<typeof getReferralLaneStateFromFrame>["state"];
};

/** Renders the referral state marker in authored paint order. */
export function ReferralStateMarker(options: Readonly<Props>): ReactNode {
  return (
    <circle
      cx={355}
      cy={options.y}
      r={5}
      fill={
        options.state === "closed"
          ? options.accent
          : options.state === "attendedOpen"
            ? options.tokens.color.highlight
            : options.tokens.color.inactive
      }
    />
  );
}
