import { SketchedShape } from "../../../primitives/SketchedShape";
import { ReferralLanePersonId } from "./ReferralLanePersonId";
import { ReferralSlip } from "./ReferralSlip";
import { ReferralStateCaption } from "./ReferralStateCaption";
import { ReferralStateMarker } from "./ReferralStateMarker";
import { ReturnedReferralReceipt } from "./ReturnedReferralReceipt";
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
  index: Readonly<ParentProps>["index"];
  frame: Readonly<ParentProps>["frame"];
  input: Readonly<ParentProps>["input"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  y: ReturnType<typeof getReferralLaneStateFromFrame>["y"];
  drawing: {
    referral: Readonly<ParentProps>["referral"];
    input: Readonly<ParentProps>["input"];
    accent: Readonly<ParentProps>["accent"];
    tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
    travel: ReturnType<typeof getReferralLaneStateFromFrame>["travel"];
    x: ReturnType<typeof getReferralLaneStateFromFrame>["x"];
    y: ReturnType<typeof getReferralLaneStateFromFrame>["y"];
    state: ReturnType<typeof getReferralLaneStateFromFrame>["state"];
    scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
    returned: ReturnType<typeof getReferralLaneStateFromFrame>["returned"];
    receiptX: ReturnType<typeof getReferralLaneStateFromFrame>["receiptX"];
  };
};

/** Renders the referral lane content in authored paint order. */
export function ReferralLaneContent(options: Readonly<Props>): ReactNode {
  return (
    <g
      opacity={options.motion.ramp(
        options.frame,
        12 + options.index * options.motion.stagger.list,
        options.motion.scale(14),
        options.motion.reveal.easing,
      )}
    >
      <SketchedShape
        shape={{
          kind: "path",
          d: `M90 ${options.y + (options.input.showLedger ? 30 : 44)} H880`,
        }}
        profile={options.tokens.sketch.shape}
        stroke={options.tokens.color.line}
      />
      <ReferralLanePersonId {...options.drawing} />
      <ReferralSlip {...options.drawing} />
      <ReturnedReferralReceipt {...options.drawing} />
      {options.input.showLedger ? (
        <ReferralStateMarker {...options.drawing} />
      ) : (
        <ReferralStateCaption {...options.drawing} />
      )}
    </g>
  );
}
