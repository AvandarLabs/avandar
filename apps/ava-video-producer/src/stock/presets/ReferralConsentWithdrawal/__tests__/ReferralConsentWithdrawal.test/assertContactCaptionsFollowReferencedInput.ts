import { ReferralConsentWithdrawalTestState } from "./ReferralConsentWithdrawalTestState";

const { statusInput: _statusInput, assertStatuses: _assertStatuses } =
  ReferralConsentWithdrawalTestState;

import assert from "node:assert/strict";
import {
  inputSchema,
  type Input,
} from "../../ReferralConsentWithdrawal.schema";

/** Asserts an independently authored portion of the rendered contract. */
export function assertContactCaptionsFollowReferencedInput(
  input: Readonly<Input>,
): void {
  _assertStatuses({
    input,
    frame: 108,
    statuses: ["On hold", "On hold", "On hold"],
  });
  const withReady = _statusInput(true);
  assert.ok(inputSchema.safeParse(withReady).success);
  [36, 40, 44].forEach((frame) => {
    return _assertStatuses({
      input: withReady,
      frame,
      statuses: ["Granted", "Granted", "Granted"],
    });
  });
  _assertStatuses({
    input: withReady,
    frame: 48,
    statuses: ["Recalled", "Granted", "Recalled"],
  });
  _assertStatuses({
    input: withReady,
    frame: 92,
    statuses: ["On hold", "Granted", "On hold"],
  });
}
