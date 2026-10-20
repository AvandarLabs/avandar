import { propEq, prop  } from "@avandar/utils";
import { ramp } from "../../../motion";
import type { Input } from "./ReferralConsentWithdrawal.schema";
/** Each withdrawn permission turns in authored permission order. */
export function getConsentTurnFromPermissionsAndFrame({
  frame,
  permissions,
  permissionId,
}: Readonly<{
  frame: number;
  permissions: Input["permissions"];
  permissionId: string;
}>): number {
  const order = permissions
    .filter(prop("withdrawn"))
    .findIndex(propEq("id", permissionId));
  return order < 0 ? 0 : ramp(frame, 36 + order * 8, 8);
}
