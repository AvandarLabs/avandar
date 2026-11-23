import assert from "node:assert/strict";
import { type Input } from "../PooledDonorAllocation.schema";

/** Asserts every donor credit retains its exact allowed request attribution. */
export function assertDonorCreditsRemainAttributed({
  donor,
  tokens,
}: Readonly<{
  donor: Input["contributions"][number];
  tokens: readonly RegExpExecArray[];
}>): void {
  const attributed = tokens.filter(([attributes]) => {
    return attributes.includes(`data-donor="${donor.id}"`);
  });
  assert.equal(attributed.length, donor.credits);
  attributed.forEach(([attributes]) => {
    if (
      attributes.includes('data-owner="request"') &&
      donor.earmarkedRequestId !== null
    ) {
      assert.ok(
        attributes.includes(`data-request="${donor.earmarkedRequestId}"`),
      );
    }
  });
}
