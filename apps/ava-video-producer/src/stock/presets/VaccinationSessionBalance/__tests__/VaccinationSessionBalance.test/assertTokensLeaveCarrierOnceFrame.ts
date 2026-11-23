import { VaccinationSessionBalanceTestState } from "./VaccinationSessionBalanceTestState";

const { render: _render } = VaccinationSessionBalanceTestState;

import assert from "node:assert/strict";
import { type Input } from "../../VaccinationSessionBalance.schema";

/**
 * Asserts tokens leave the carrier once, remain conserved and settle beside
 * the exact recipient.
 */
export function assertTokensLeaveCarrierOnceFrame({
  frame,
  input,
}: Readonly<{ frame: number; input: Readonly<Input> }>): void {
  const markup = _render({ frame, input });
  const tokens = Array.from(
    markup.matchAll(
      /<rect data-dose="([^"]*)"[^>]* x="([^"]*)" y="([^"]*)" width="11" height="16"/g,
    ),
  );
  assert.equal(tokens.length, input.units.length);
  assert.equal(
    new Set(
      tokens.map((match) => {
        return match[1];
      }),
    ).size,
    12,
  );
  tokens.forEach((match) => {
    const x = Number(match[2]);
    const y = Number(match[3]);
    assert.ok(x >= 35 && x + 11 <= 930);
    assert.ok(y >= 180 && y + 16 <= 460);
    if (frame === 24) {
      assert.ok(x + 11 < 245);
    }
    if (frame >= 108) {
      assert.ok(x > 280 && x + 11 < 655);
    }
  });
}
