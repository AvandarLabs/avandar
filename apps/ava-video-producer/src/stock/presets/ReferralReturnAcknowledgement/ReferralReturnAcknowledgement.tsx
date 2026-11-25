import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ReceivingServiceAndGuide } from "./ReceivingServiceAndGuide";
import { ReferralLedger } from "./ReferralLedger/ReferralLedger";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./ReferralReturnAcknowledgement.schema";
import type { ReactNode } from "react";

/** Explicit referral facts and local frame. */
export type Props = GraphicProps & { input: Input };

/** Attendance travels outward while independent communication returns. */
export function ReferralReturnAcknowledgement({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g opacity={motion.ramp(frame, 12, motion.hero, motion.reveal.easing)}>
      <FitText
        text={input.sceneLabel}
        x={50}
        y={38}
        width={850}
        fontSize={14}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: "M70 138 V74 H325 V138 M570 138 V74 H890 V138",
        }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.line}
        fill="none"
      />
      <FitText
        text={input.services.referring}
        x={85}
        y={95}
        width={230}
        fontSize={16}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      <ReceivingServiceAndGuide input={input} frame={frame} accent={accent} />
      {input.showLedger ? (
        <ReferralLedger input={input} frame={frame} />
      ) : undefined}
    </g>
  );
}
