import assert from "node:assert/strict";
import test from "node:test";
import { createMappingStageFromFrame } from "./createMappingStageFromFrame";

// Wrong branches would misrepresent multiplicity, aggregation or text entry.
test("one-value selection precedes the authored sum aggregation", () => {
  assert.equal(createMappingStageFromFrame(97).isArray, true);
  assert.equal(createMappingStageFromFrame(98).isArray, false);
  assert.equal(
    createMappingStageFromFrame(217).valuePickerRuleType,
    "most_frequent",
  );
  assert.equal(createMappingStageFromFrame(218).valuePickerRuleType, "sum");
});

test("manual field preserves Add field defaults before the name is replaced", () => {
  assert.equal(createMappingStageFromFrame(337).manualField, undefined);
  assert.deepEqual(createMappingStageFromFrame(338).manualField, {
    name: { kind: "default" },
    allowManualEdit: false,
    isArray: false,
    isNameSelected: false,
  });
  assert.deepEqual(createMappingStageFromFrame(357).manualField?.name, {
    kind: "default",
  });
  assert.deepEqual(createMappingStageFromFrame(358).manualField?.name, {
    kind: "typed",
    value: "",
  });
  assert.deepEqual(createMappingStageFromFrame(400).manualField?.name, {
    kind: "typed",
    value: "follow_",
  });
  assert.deepEqual(createMappingStageFromFrame(659).manualField?.name, {
    kind: "typed",
    value: "follow_up_note",
  });
  assert.equal(
    createMappingStageFromFrame(659).manualField?.allowManualEdit,
    false,
  );
});

test("the default field name is selected before replacement starts", () => {
  assert.equal(
    createMappingStageFromFrame(349).manualField?.isNameSelected,
    false,
  );
  assert.equal(
    createMappingStageFromFrame(350).manualField?.isNameSelected,
    true,
  );
  assert.equal(
    createMappingStageFromFrame(357).manualField?.isNameSelected,
    true,
  );
  assert.equal(
    createMappingStageFromFrame(358).manualField?.isNameSelected,
    false,
  );
});

test("aggregation options open before the sum selection and close afterward", () => {
  assert.equal(createMappingStageFromFrame(157).isRuleMenuOpen, false);
  assert.equal(createMappingStageFromFrame(158).isRuleMenuOpen, true);
  assert.equal(createMappingStageFromFrame(217).isRuleMenuOpen, true);
  assert.equal(createMappingStageFromFrame(218).isRuleMenuOpen, false);
});

test("random seeks restore original controls without retaining later edits", () => {
  createMappingStageFromFrame(659);
  assert.deepEqual(createMappingStageFromFrame(0), {
    isArray: true,
    allowManualEdit: false,
    valuePickerRuleType: "most_frequent",
    isRuleMenuOpen: false,
    manualField: undefined,
  });
});
