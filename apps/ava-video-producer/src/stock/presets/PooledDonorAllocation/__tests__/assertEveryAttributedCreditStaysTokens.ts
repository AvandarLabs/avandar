import { PooledDonorAllocationTestState } from "./PooledDonorAllocationTestState";

const { getTokenCoordinate: _getTokenCoordinate } =
  PooledDonorAllocationTestState;

import assert from "node:assert/strict";
import { type Input } from "../PooledDonorAllocation.schema";

/**
 * Asserts every attributed credit stays singular, restricted and visibly
 * above its envelope.
 */
export function assertEveryAttributedCreditStaysTokens({
  tokens,
  input,
  frame,
}: Readonly<{
  tokens: Readonly<RegExpExecArray[]>;
  input: Readonly<Input>;
  frame: number;
}>): void {
  assert.equal(
    tokens.length,
    input.contributions.reduce((sum, item) => {
      return sum + item.credits;
    }, 0),
  );
  assert.equal(
    new Set(
      tokens.map((match) => {
        return match[1];
      }),
    ).size,
    tokens.length,
  );
  tokens.forEach(([attributes]) => {
    const x = _getTokenCoordinate({ attributes, axis: "x" });
    const y = _getTokenCoordinate({ attributes, axis: "y" });
    assert.ok(x >= 17 && x <= 943 && y >= 140 && y <= 440);
    // The full four-line sidebar ends below y=327; tokens reserve 17px
    // around it.
    if (y > 205 && y < 344) {
      assert.ok(
        x - 17 >= 238,
        `token occludes pool labels at ${x},${y}, frame ${frame}`,
      );
    }
  });
}
