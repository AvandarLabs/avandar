import { SpecimenAliquotBalanceTestState } from "./SpecimenAliquotBalanceTestState";

const { attributes: _attributes } = SpecimenAliquotBalanceTestState;

import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { DEFAULT_INPUT } from "../../SpecimenAliquotBalance.fixtures";

/**
 * Asserts transferred liquid reduces the parent and preserves every child's
 * lineage.
 */
export function assertTransferredLiquidReducesParentParentAfter({
  parentAfter,
  after,
}: Readonly<{ parentAfter: string; after: string }>): void {
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: parentAfter,
      name: "height",
    }),
    9,
  );
  let volume =
    SvgAttributes.getNumberFromMarkup({
      attributes: parentAfter,
      name: "height",
    }) / 9;
  DEFAULT_INPUT.aliquots.forEach((aliquot) => {
    const liquid = _attributes({
      markup: after,
      attribute: "data-liquid-id",
      value: aliquot.id,
    });
    volume +=
      SvgAttributes.getNumberFromMarkup({
        attributes: liquid,
        name: "height",
      }) / 9;
    assert.ok(liquid.includes(`data-parent-id="${DEFAULT_INPUT.parent.id}"`));
  });
  assert.equal(volume, DEFAULT_INPUT.parent.volume);
}
