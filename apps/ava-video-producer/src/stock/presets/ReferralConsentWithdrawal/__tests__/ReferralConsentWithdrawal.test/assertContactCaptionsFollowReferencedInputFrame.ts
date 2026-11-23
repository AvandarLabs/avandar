import { ReferralConsentWithdrawalTestState } from "./ReferralConsentWithdrawalTestState";

const { assertStatuses: _assertStatuses } = ReferralConsentWithdrawalTestState;

import assert from "node:assert/strict";
import {
  inputSchema,
  type Input,
} from "../../ReferralConsentWithdrawal.schema";

/**
 * Asserts contact captions follow referenced permission turns despite
 * reordered and repeated contacts.
 */
export function assertContactCaptionsFollowReferencedInputFrame(
  input: Readonly<Input>,
): void {
  assert.ok(inputSchema.safeParse(input).success);
  [35, 36].forEach((frame) => {
    return _assertStatuses({
      input,
      frame,
      statuses: ["Granted", "Granted", "Granted"],
    });
  });
  [40, 44, 48, 52].forEach((frame) => {
    return _assertStatuses({
      input,
      frame,
      statuses: ["Granted", "Recalled", "Granted"],
    });
  });
  [56, 60, 70].forEach((frame) => {
    return _assertStatuses({
      input,
      frame,
      statuses: ["Recalled", "Recalled", "Recalled"],
    });
  });
}
