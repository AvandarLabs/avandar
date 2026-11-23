import { StockRect } from "../../../primitives/StockRect";
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
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  x: ReturnType<typeof getReferralLaneStateFromFrame>["x"];
  y: ReturnType<typeof getReferralLaneStateFromFrame>["y"];
};

/** Renders the referral slip in authored paint order. */
export function ReferralSlip(options: Readonly<Props>): ReactNode {
  return (
    <StockRect
      data-referral-slip={options.referral.id}
      x={options.x - 32}
      y={options.y - 13}
      width={17}
      height={24}
      rx={options.scales.corner(2)}
      fill={options.tokens.color.surface}
      stroke={options.tokens.color.accentAlt}
    />
  );
}
