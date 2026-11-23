import { PrivateCaseConversationTestState } from "./PrivateCaseConversationTestState";

const {
  render: _render,
  EXCLUDED_TEXT_FIELDS,
  visible: _visible,
  escape: _escape,
} = PrivateCaseConversationTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { privateCaseConversationContract as contract } from "../../PrivateCaseConversation.contract";
import {
  DEFAULT_INPUT,
  INVALID_INPUTS,
  fixtures,
} from "../../PrivateCaseConversation.fixtures";
import { inputSchema } from "../../PrivateCaseConversation.schema";
import { assertBothPartitionsCloseBehindPartition as _assertBothPartitionsCloseBehindPartition } from "./assertBothPartitionsCloseBehindPartition";

test("supporter exits before partition closure while both meeting seats remain", () => {
  const setup = _render({ frame: 20 });
  const exited = _render({ frame: 84 });
  const hold = _render({ frame: 150 });
  assert.match(setup, /data-person="s"[^>]*data-space="meeting"/);
  assert.match(exited, /data-person="s"[^>]*data-space="waiting"/);
  assert.match(exited, /data-partition="screen"[^>]*data-closed="false"/);
  assert.match(hold, /data-partition="screen"[^>]*data-closed="true"/);
  ["p", "w"].forEach((id) => {
    return assert.match(
      hold,
      new RegExp(`data-person="${id}"[^>]*data-space="meeting"`),
    );
  });
});

registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  contract,
  invalidInputs: INVALID_INPUTS,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: ({ input, frame }) => {
    return _visible({ input: input, frame: frame }).map(_escape);
  },
});

registerStockTextLayoutAssertions({
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _visible,
});

test("both partitions close behind the fully exited supporter with either inset choice", () => {
  (["door", "screen"] as const).forEach((partition) => {
    return _assertBothPartitionsCloseBehindPartition(partition);
  });
});
