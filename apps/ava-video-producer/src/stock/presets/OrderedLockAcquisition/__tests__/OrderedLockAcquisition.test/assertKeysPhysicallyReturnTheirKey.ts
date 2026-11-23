import { OrderedLockAcquisitionTestState } from "./OrderedLockAcquisitionTestState";

const { render: _render } = OrderedLockAcquisitionTestState;

import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { DEFAULT_INPUT } from "../../OrderedLockAcquisition.fixtures";

/**
 * Asserts keys physically return to their tray before the waiting operation
 * reuses them.
 */
export function assertKeysPhysicallyReturnTheirKey(
  key: (frame: number, resource: string) => RegExpMatchArray[number],
): void {
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: key(122, "b"),
      name: "cy",
    }),
    100,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: key(138, "a"),
      name: "cy",
    }),
    435,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: key(138, "b"),
      name: "cy",
    }),
    435,
  );
  assert.match(key(122, "a"), /data-key-owner=""/);
  assert.doesNotMatch(
    _render({ frame: 108, input: DEFAULT_INPUT }),
    /data-key-owner="two"/,
  );
}
