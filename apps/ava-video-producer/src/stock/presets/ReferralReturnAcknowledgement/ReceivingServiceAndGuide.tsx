import { FitText } from "../../primitives/FitText/FitText";
import { ReferralLane } from "./ReferralLane/ReferralLane";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./ReferralReturnAcknowledgement.schema";
import type { ReactNode } from "react";

/** Explicit referral facts and local frame. */
export type ParentProps = GraphicProps & { input: Input };

type Props = {
  input: Readonly<ParentProps>["input"];
  frame: Readonly<ParentProps>["frame"];
  accent: Readonly<ParentProps>["accent"];
};

/** Renders the receiving service and guide in authored paint order. */
export function ReceivingServiceAndGuide(options: Readonly<Props>): ReactNode {
  return (
    <>
      <FitText
        text={options.input.services.receiving}
        x={600}
        y={95}
        width={275}
        fontSize={16}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      {options.input.referrals.map((referral, index) => {
        return (
          <ReferralLane
            key={referral.id}
            referral={referral}
            index={index}
            frame={options.frame}
            input={options.input}
            accent={options.accent}
          />
        );
      })}
    </>
  );
}
