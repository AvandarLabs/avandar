import { WorkspaceCapacityExtensionTestState } from "./WorkspaceCapacityExtensionTestState";

const {
  render: _render,
  getVisibleTexts: _getVisibleTexts,
  EXCLUDED_TEXT_FIELDS,
  assertPendingCaptionClearance: _assertPendingCaptionClearance,
} = WorkspaceCapacityExtensionTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { getTextEnvelopesFromMarkup } from "../../SchemaColumnEvolution/getTextEnvelopesFromMarkup";
import { INVALID_INPUTS } from "../rejectedInputs.constants";
import { workspaceCapacityExtensionContract } from "../WorkspaceCapacityExtension.contract";
import {
  DEFAULT_INPUT,
  MINIMUM_INPUT,
  DENSE_INPUT,
  CHANGED_INPUT,
  fixtures,
} from "../WorkspaceCapacityExtension.fixtures";
import { inputSchema } from "../WorkspaceCapacityExtension.schema";
import { assertExistingTabsRemainIdenticalBefore as _assertExistingTabsRemainIdenticalBefore } from "./assertExistingTabsRemainIdenticalBefore";

test("the same tray preserves existing positions while only expand admits the complete request", () => {
  const before = _render({ frame: 11 });
  assert.equal((before.match(/data-existing-resource=/g) ?? []).length, 3);
  assert.match(before, /data-selected-limit="3"/);
  const after = _render({ frame: 150 });
  assert.equal((after.match(/data-existing-resource=/g) ?? []).length, 3);
  assert.equal((after.match(/data-request-state="seated"/g) ?? []).length, 2);
  assert.match(after, /data-selected-limit="5"/);
  const kept = _render({ frame: 150, input: CHANGED_INPUT });
  assert.match(kept, /data-selected-limit="3"/);
  assert.equal((kept.match(/data-request-state="pending"/g) ?? []).length, 2);
  assert.doesNotMatch(kept, /data-extra-slot=/);
});

test("complete fixture set includes minimum, dense and changed inputs before behavior", () => {
  [DEFAULT_INPUT, MINIMUM_INPUT, DENSE_INPUT, CHANGED_INPUT].forEach(
    (input) => {
      return assert.deepEqual(inputSchema.parse(input), input);
    },
  );
  assert.equal(fixtures.length, 4);
});

test("invalid structure and cross-field values are rejected", () => {
  INVALID_INPUTS.forEach((input) => {
    return assert.equal(inputSchema.safeParse(input).success, false);
  });
});

registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs: INVALID_INPUTS,
  contract: workspaceCapacityExtensionContract,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
});

registerStockTextLayoutAssertions({
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
});

test("partially revealed new slots stay inside the actually extended tray", () => {
  [81.5, 88, 100, 106, 110, 125, 150].forEach((frame) => {
    const markup = _render({ frame: frame, input: DENSE_INPUT });
    const tray = markup.match(/d="M80 220 H([^ ]*)[^>]*data-capacity-tray=""/)!;
    assert.ok(tray);
    [...markup.matchAll(/<rect data-extra-slot[^>]*>/g)].forEach((slot) => {
      return assert.ok(
        SvgAttributes.getNumberFromMarkup({ attributes: slot[0], name: "x" }) +
          SvgAttributes.getNumberFromMarkup({
            attributes: slot[0],
            name: "width",
          }) <=
          Number(tray[1]),
      );
    });
  });
});

test("existing tabs remain at identical positions and only complete expansion seats requests", () => {
  _assertExistingTabsRemainIdenticalBefore();
  assert.equal(
    (
      _render({ frame: 124, input: DENSE_INPUT }).match(
        /data-request-state="pending"/g,
      ) ?? []
    ).length,
    3,
  );
  assert.equal(
    (
      _render({ frame: 125, input: DENSE_INPUT }).match(
        /data-request-state="seated"/g,
      ) ?? []
    ).length,
    3,
  );
  const spare = {
    ...DEFAULT_INPUT,
    existingResources: DEFAULT_INPUT.existingResources.slice(0, 2),
    allowances: {
      ...DEFAULT_INPUT.allowances,
      currentAllowance: { label: "Current", limit: 3 },
    },
    choice: { decision: "keep" as const, label: "Keep" },
    showResourceLabels: false,
  };
  assert.equal(
    (
      _render({ frame: 150, input: spare }).match(
        /data-request-state="pending"/g,
      ) ?? []
    ).length,
    2,
  );
  assert.doesNotMatch(
    _render({ frame: 150, input: spare }),
    /data-extra-slot=/,
  );
});

test("full resource names remain inside moving tabs and clear framing captions", () => {
  const input = {
    ...DENSE_INPUT,
    existingResources: DENSE_INPUT.existingResources.map((row) => {
      return { ...row, label: "界 界界界界 界界界界界界界界界界界界界" };
    }),
    requestedResources: DENSE_INPUT.requestedResources.map((row) => {
      return { ...row, label: "界 界界界界 界界界界界界界界界界界界界" };
    }),
  };
  [50, 80, 100, 110, 124, 125, 150].forEach((frame) => {
    const markup = _render({ frame: frame, input: input });
    const texts = getTextEnvelopesFromMarkup(markup);
    const tabs = [...markup.matchAll(/<rect data-resource-tab[^>]*>/g)];
    tabs.forEach((tab) => {
      const x = SvgAttributes.getNumberFromMarkup({
        attributes: tab[0],
        name: "x",
      });
      const y = SvgAttributes.getNumberFromMarkup({
        attributes: tab[0],
        name: "y",
      });
      const name = texts.find((text) => {
        return text.x === x + 5 && text.y === y + 36;
      })!;
      assert.ok(name.right <= x + 78);
      assert.ok(name.bottom <= y + 132);
      assert.ok(y > 216);
      assert.ok(y + 132 < 563);
    });
  });
});

test("pending caption identifies the moving request group and clears its seating path", () => {
  [12.5, 36, 50, 80, 106, 110, 120, 124.99].forEach((frame) => {
    return _assertPendingCaptionClearance({ input: DEFAULT_INPUT, frame });
  });
  [MINIMUM_INPUT, DENSE_INPUT].forEach((input) => {
    const fullCaption = {
      ...input,
      copy: { ...input.copy, pending: "界".repeat(42) },
    };
    [36, 110, 124].forEach((frame) => {
      return _assertPendingCaptionClearance({ input: fullCaption, frame });
    });
  });
  assert.doesNotMatch(_render({ frame: 125 }), /data-pending-link/);
  assert.ok(
    !_render({ frame: 125 }).includes(
      `aria-label="${DEFAULT_INPUT.copy.pending}"`,
    ),
  );
});

test("hidden resource names retain an associated pending caption when capacity is kept", () => {
  const input = { ...CHANGED_INPUT, showResourceLabels: false };
  [36, 106, 125, 150, 167].forEach((frame) => {
    _assertPendingCaptionClearance({ input, frame });
    const markup = _render({ frame: frame, input: input });
    assert.equal(
      (markup.match(/data-request-state="pending"/g) ?? []).length,
      input.requestedResources.length,
    );
    input.requestedResources.forEach((resource) => {
      return assert.ok(!markup.includes(`aria-label="${resource.label}"`));
    });
  });
});
