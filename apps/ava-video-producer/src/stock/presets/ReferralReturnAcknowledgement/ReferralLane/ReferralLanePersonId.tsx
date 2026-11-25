import { FitText } from "../../../primitives/FitText/FitText";
import { PersonGlyph } from "../../../primitives/PersonGlyph/PersonGlyph";
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
  travel: ReturnType<typeof getReferralLaneStateFromFrame>["travel"];
  x: ReturnType<typeof getReferralLaneStateFromFrame>["x"];
  y: ReturnType<typeof getReferralLaneStateFromFrame>["y"];
  state: ReturnType<typeof getReferralLaneStateFromFrame>["state"];
};

/** Renders the referral lane person id in authored paint order. */
export function ReferralLanePersonId(options: Readonly<Props>): ReactNode {
  return (
    <g
      data-person-id={options.referral.id}
      data-x={options.x}
      data-state={options.state}
    >
      <PersonGlyph
        x={options.x}
        y={options.y}
        size={32}
        color={
          options.input.emphasis === "person-journey"
            ? options.accent
            : options.tokens.color.accentAlt
        }
        posture={
          options.travel > 0 && options.travel < 1 ? "walking" : "standing"
        }
      />
      <FitText
        text={options.referral.personLabel}
        x={options.x + 22}
        y={options.y - 5}
        width={145}
        fontSize={12}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
