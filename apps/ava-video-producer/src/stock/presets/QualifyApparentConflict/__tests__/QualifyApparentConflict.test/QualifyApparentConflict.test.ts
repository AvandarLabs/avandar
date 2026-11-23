import { QualifyApparentConflictTestState } from "./QualifyApparentConflictTestState";

const { render: _render } = QualifyApparentConflictTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { qualifyApparentConflictContract as contract } from "../../QualifyApparentConflict.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../../QualifyApparentConflict.fixtures";
import { inputSchema } from "../../QualifyApparentConflict.schema";
import { assertOriginalClaimsSurviveUnderHeld as _assertOriginalClaimsSurviveUnderHeld } from "./assertOriginalClaimsSurviveUnderHeld";

registerStockPresetAssertions({
  contract,
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  render: _render,
  excludedTextFields: ["id", "contextPlacement"],
});

test("original claims survive under their authored contexts before the qualifier resolves", () => {
  const early = _render({ frame: 48 });
  const split = _render({ frame: 90 });
  const held = _render({ frame: 150 });
  DEFAULT_INPUT.statements.forEach(({ id, claim, context }) => {
    assert.ok(held.includes(`data-statement="${id}"`));
    assert.ok(held.includes(`aria-label="${claim}"`));
    assert.ok(held.includes(`aria-label="${context}"`));
  });
  assert.match(
    SvgAttributes.fromMarker({ markup: early, marker: "qualifier" }),
    /opacity="0"/,
  );
  assert.match(
    SvgAttributes.fromMarker({ markup: split, marker: "qualifier" }),
    /opacity="0"/,
  );
  assert.match(
    SvgAttributes.fromMarker({ markup: held, marker: "qualifier" }),
    /opacity="1"/,
  );
  _assertOriginalClaimsSurviveUnderHeld(held);
  assert.match(
    SvgAttributes.fromMarker({ markup: held, marker: "context-divider" }),
    /y1="130"[^>]*y2="410"/,
  );
  assert.match(
    SvgAttributes.fromMarker({
      markup: _render({
        frame: 150,
        input: { ...DEFAULT_INPUT, showCentralDivider: false },
      }),
      marker: "context-divider",
    }),
    /opacity="0"/,
  );
  assert.match(
    SvgAttributes.fromMarker({ markup: held, marker: "joining-brace" }),
    /opacity="1"/,
  );
  assert.notEqual(early, held);
});
