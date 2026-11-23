import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getConsentTurnFromPermissionsAndFrame } from "../getConsentTurnFromPermissionsAndFrame";
import type { Input } from "../ReferralConsentWithdrawal.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = {
  frame: number;
  input: Input;
  accent: string;
  permission: Input["permissions"][number];
  index: number;
};

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  input: Options["input"];
  accent: Options["accent"];
  permission: Options["permission"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  y: number;
  turn: number;
  width: number;
};

/**
 * Returns permission state, slip position, rotation, and theme values for
 * `ConsentSlip`, `ConsentSlipCopy`.
 */
export function useConsentSlipPresentation({
  frame,
  input,
  accent,
  permission,
  index,
}: Readonly<Options>): Presentation {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const y = 190 + index * 102;
  const turn = getConsentTurnFromPermissionsAndFrame({
    frame,
    permissions: input.permissions,
    permissionId: permission.id,
    motion,
  });
  const width = 460 * (0.12 + 0.88 * Math.abs(2 * turn - 1));
  return { input, accent, permission, tokens, scales, y, turn, width };
}
