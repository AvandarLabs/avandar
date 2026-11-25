import { PooledDonorAllocationTestState } from "./PooledDonorAllocationTestState";

const { render: _render, getTokenCoordinate: _getTokenCoordinate } =
  PooledDonorAllocationTestState;
import assert from "node:assert/strict";
import { type Input } from "../PooledDonorAllocation.schema";
import { assertDonorCreditsRemainAttributed as _assertDonorCreditsRemainAttributed } from "./assertDonorCreditsRemainAttributed";
import { assertEveryAttributedCreditStaysRequest as _assertEveryAttributedCreditStaysRequest } from "./assertEveryAttributedCreditStaysRequest";
import { assertEveryAttributedCreditStaysTokens as _assertEveryAttributedCreditStaysTokens } from "./assertEveryAttributedCreditStaysTokens";

/**
 * Asserts every attributed credit stays singular, restricted and visibly
 * above its envelope.
 */
export function assertEveryAttributedCreditStaysFrame({
  frame,
  input,
}: Readonly<{ frame: number[][number]; input: Readonly<Input> }>): void {
  const markup = _render({ frame: frame, input: input });
  const tokens = [...markup.matchAll(/<g data-token="([^"]*)"[^>]*>/g)];
  _assertEveryAttributedCreditStaysTokens({ tokens, input, frame });
  if (frame < 132) {
    return;
  }
  input.contributions.forEach((donor) => {
    return _assertDonorCreditsRemainAttributed({ donor, tokens });
  });
  input.requests.forEach((request) => {
    return _assertEveryAttributedCreditStaysRequest({
      request,
      tokens,
      input,
      markup,
    });
  });
  tokens.forEach(([attributes], index) => {
    return tokens.slice(index + 1).forEach(([other]) => {
      return assert.ok(
        Math.hypot(
          _getTokenCoordinate({ attributes, axis: "x" }) -
            _getTokenCoordinate({ attributes: other, axis: "x" }),
          _getTokenCoordinate({ attributes, axis: "y" }) -
            _getTokenCoordinate({ attributes: other, axis: "y" }),
        ) >= 34,
      );
    });
  });
}
