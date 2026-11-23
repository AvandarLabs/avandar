import { SharedFoundationTestState } from "./SharedFoundationTestState";

const { render: _render } = SharedFoundationTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { sharedFoundationContract as contract } from "../../SharedFoundation.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../../SharedFoundation.fixtures";
import { inputSchema } from "../../SharedFoundation.schema";
import { assertTwoDistinctApproachesReconnectChanged as _assertTwoDistinctApproachesReconnectChanged } from "./assertTwoDistinctApproachesReconnectChanged";
import { assertTwoDistinctApproachesReconnectHeld as _assertTwoDistinctApproachesReconnectHeld } from "./assertTwoDistinctApproachesReconnectHeld";

registerStockPresetAssertions({
  contract,
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  render: _render,
  excludedTextFields: ["id", "foundationReveal"],
});

test("two distinct approaches reconnect to one changing common foundation", () => {
  const held = _render({ frame: 150 });
  const changed = _render({
    frame: 150,
    input: {
      ...DEFAULT_INPUT,
      sharedPrinciple: "A different authored purpose",
    },
  });
  assert.equal((held.match(/data-approach=/g) ?? []).length, 2);
  assert.equal((held.match(/data-foundation-support=/g) ?? []).length, 2);
  assert.equal((held.match(/data-shared-principle=/g) ?? []).length, 1);
  DEFAULT_INPUT.approaches.forEach(({ id, label, distinction }) => {
    assert.ok(changed.includes(`data-approach="${id}"`));
    assert.ok(changed.includes(`aria-label="${label}"`));
    assert.ok(changed.includes(`aria-label="${distinction}"`));
  });
  _assertTwoDistinctApproachesReconnectChanged({ changed, held });
  const joining = _render({ frame: 72 });
  assert.ok(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: joining,
        marker: "foundation-left",
      }),
      name: "width",
    }) < 400,
  );
  _assertTwoDistinctApproachesReconnectHeld(held);
});

test("supports reconnect only after the foundation fragments have joined", () => {
  const before = _render({ frame: 96 });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: before,
        marker: "foundation-support",
      }),
      name: "y2",
    }),
    330,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: _render({ frame: 108 }),
        marker: "foundation-support",
      }),
      name: "y2",
    }),
    330,
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: _render({ frame: 114 }),
        marker: "foundation-support",
      }),
      name: "y2",
    }) > 330,
  );
});
