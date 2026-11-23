import { propEq, prop } from "@avandar/utils";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./ReferralConsentWithdrawal.schema";
/** Each withdrawn permission turns in authored permission order. */
export function getConsentTurnFromPermissionsAndFrame({
  frame,
  permissions,
  permissionId,
  motion,
}: Readonly<{
  frame: number;
  permissions: Input["permissions"];
  permissionId: string;
  motion: VideoMotion;
}>): number {
  const order = permissions
    .filter(prop("withdrawn"))
    .findIndex(propEq("id", permissionId));
  return order < 0
    ? 0
    : motion.ramp(
        frame,
        36 + order * motion.scaleStagger(8),
        motion.whip,
        motion.entrance.easing,
      );
}
