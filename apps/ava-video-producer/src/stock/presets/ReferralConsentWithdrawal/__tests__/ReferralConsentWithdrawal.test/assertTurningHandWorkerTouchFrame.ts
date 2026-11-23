import { ReferralConsentWithdrawalTestState } from "./ReferralConsentWithdrawalTestState";

const { render: _render } = ReferralConsentWithdrawalTestState;

import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";

/**
 * Asserts the turning hand and the worker touch their actual moving objects.
 */
export function assertTurningHandWorkerTouchFrame(frame: number): void {
  const markup = _render({ frame: frame });
  const card = SvgAttributes.fromMarker({ markup, marker: "contact-card" });
  const x = SvgAttributes.getNumberFromMarkup({ attributes: card, name: "x" });
  const y = SvgAttributes.getNumberFromMarkup({ attributes: card, name: "y" });
  assert.ok(
    SvgAttributes.fromMarker({ markup, marker: "worker-hand" }).includes(
      `L${x + 350} ${y + 28}`,
    ),
  );
  assert.ok(y > 163, "card never touches the idle phone");
  assert.ok(x >= 520 && x + 350 <= 910);
}
