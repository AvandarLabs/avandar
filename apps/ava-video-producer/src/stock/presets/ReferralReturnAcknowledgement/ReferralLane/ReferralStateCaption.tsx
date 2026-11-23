import { FitText } from "../../../primitives/FitText/FitText";
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
  input: Readonly<ParentProps>["input"];
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  y: ReturnType<typeof getReferralLaneStateFromFrame>["y"];
  state: ReturnType<typeof getReferralLaneStateFromFrame>["state"];
};

/** Renders the referral state caption in authored paint order. */
export function ReferralStateCaption(options: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={options.input.copy[options.state]}
      x={370}
      y={options.y - 12}
      width={220}
      fontSize={12}
      maxLines={4}
      breakLongWords
      normalizeWhitespace
      color={
        options.state === "closed"
          ? options.accent
          : options.tokens.color.textMuted
      }
    />
  );
}
