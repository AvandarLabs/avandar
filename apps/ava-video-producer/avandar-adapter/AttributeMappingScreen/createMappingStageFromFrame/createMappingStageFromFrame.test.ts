import assert from "node:assert/strict";
import test from "node:test";
import { makeMappingStageFromFrame } from "../makeMappingStageFromFrame/makeMappingStageFromFrame";

// Wrong branches would misrepresent multiplicity, aggregation or text entry.
test("one-value selection precedes the authored sum aggregation", () => {
  assert.equal(makeMappingStageFromFrame(97).isArray, true);
  assert.equal(makeMappingStageFromFrame(98).isArray, false);
  assert.equal(
    makeMappingStageFromFrame(217).valuePickerRuleType,
    "most_frequent",
  );
  assert.equal(makeMappingStageFromFrame(218).valuePickerRuleType, "sum");
});

test("manual field preserves Add field defaults before the name is replaced", () => {
  assert.equal(makeMappingStageFromFrame(337).manualField, undefined);
  assert.deepEqual(makeMappingStageFromFrame(338).manualField, {
    name: { kind: "default" },
    allowManualEdit: false,
    isArray: false,
    isNameSelected: false,
  });
  assert.deepEqual(makeMappingStageFromFrame(357).manualField?.name, {
    kind: "default",
  });
  assert.deepEqual(makeMappingStageFromFrame(358).manualField?.name, {
    kind: "typed",
    value: "",
  });
  assert.deepEqual(makeMappingStageFromFrame(400).manualField?.name, {
    kind: "typed",
    value: "follow_",
  });
  assert.deepEqual(makeMappingStageFromFrame(659).manualField?.name, {
    kind: "typed",
    value: "follow_up_note",
  });
  assert.equal(
    makeMappingStageFromFrame(659).manualField?.allowManualEdit,
    false,
  );
});

test("the default field name is selected before replacement starts", () => {
  assert.equal(
    makeMappingStageFromFrame(349).manualField?.isNameSelected,
    false,
  );
  assert.equal(
    makeMappingStageFromFrame(350).manualField?.isNameSelected,
    true,
  );
  assert.equal(
    makeMappingStageFromFrame(357).manualField?.isNameSelected,
    true,
  );
  assert.equal(
    makeMappingStageFromFrame(358).manualField?.isNameSelected,
    false,
  );
});

test("aggregation options open before the sum selection and close afterward", () => {
  assert.equal(makeMappingStageFromFrame(157).isRuleMenuOpen, false);
  assert.equal(makeMappingStageFromFrame(158).isRuleMenuOpen, true);
  assert.equal(makeMappingStageFromFrame(217).isRuleMenuOpen, true);
  assert.equal(makeMappingStageFromFrame(218).isRuleMenuOpen, false);
});

test("random seeks restore original controls without retaining later edits", () => {
  makeMappingStageFromFrame(659);
  assert.deepEqual(makeMappingStageFromFrame(0), {
    isArray: true,
    allowManualEdit: false,
    valuePickerRuleType: "most_frequent",
    isRuleMenuOpen: false,
    manualField: undefined,
  });
});
