import { SupportRequestResponseTestState } from "./SupportRequestResponseTestState";

const { render, options } = SupportRequestResponseTestState;
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { supportRequestResponseContract } from "../../SupportRequestResponse.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../../SupportRequestResponse.fixtures";
import { inputSchema } from "../../SupportRequestResponse.schema";
import { assertOnlyJoinsBringsSecondState as _assertOnlyJoinsBringsSecondState } from "./assertOnlyJoinsBringsSecondState";
import { assertResponseTailClearsEveryColleague as _assertResponseTailClearsEveryColleague } from "./assertResponseTailClearsEveryColleague";

test("complete rejection fixtures reject structural and reference violations", () => {
  return invalidInputs.forEach((input) => {
    return assert.equal(inputSchema.safeParse(input).success, false);
  });
});

test("only joins brings a second chair and contacting hand to the still-open owner task", () => {
  ["joins", "later", "declines"].forEach((state) => {
    return _assertOnlyJoinsBringsSecondState(state);
  });
});

registerStockPresetAssertions(options);

registerStockTextLayoutAssertions(options);

test("hiding the held request leaves the supplied response painted and the chair outside the task", () => {
  const input = { ...fixtures[2].input, showRequestAtHold: false };
  const markup = render({ frame: 150, input: input });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({ markup, marker: "request-copy" }),
      name: "opacity",
    }),
    0,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({ markup, marker: "response-copy" }),
      name: "opacity",
    }),
    1,
  );
  const chair = SvgAttributes.fromMarker({ markup, marker: "second-chair" });
  const task = SvgAttributes.fromMarker({ markup, marker: "unfinished-task" });
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: chair, name: "x" }) >
      SvgAttributes.getNumberFromMarkup({ attributes: task, name: "x" }) +
        SvgAttributes.getNumberFromMarkup({ attributes: task, name: "width" }),
  );
  assert.ok(
    markup.indexOf("data-unfinished-task=") <
      markup.indexOf("data-shared-hand="),
  );
});

test("supplied multilingual prose and literal punctuation remain unchanged", () => {
  const supplied = { ...DEFAULT_INPUT, requestText: "R&D <x>\t界\n👩‍🔬" };
  assert.deepEqual(inputSchema.parse(supplied), supplied);
  assert.ok(
    render({ frame: 90, input: supplied }).includes(
      'aria-label="R&amp;D &lt;x&gt;\t界\n👩‍🔬"',
    ),
  );
});

test("distinct maximum-length participant names retain whole graphemes and fixed text slots", () => {
  [`界 ${"界".repeat(14)} 界`, "é👩‍🔬é👩‍🔬é"].forEach((label) => {
    const input = inputSchema.parse({
      ...fixtures[2].input,
      people: { requester: label, colleague: "V".repeat(18) },
    });
    const markup = render({ frame: 150, input: input });
    assert.ok(markup.includes(`aria-label="${label}"`));
    assert.ok(markup.includes(`aria-label="${input.people.colleague}"`));
  });
});

test("the colleague hand carries the actual moving chair before reaching the task", () => {
  [100, 110, 116].forEach((frame) => {
    const markup = render({ frame: frame, input: DEFAULT_INPUT });
    const hand = SvgAttributes.fromMarker({ markup, marker: "chair-hand" });
    const chair = SvgAttributes.fromMarker({ markup, marker: "second-chair" });
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cx" }),
      SvgAttributes.getNumberFromMarkup({ attributes: chair, name: "x" }) +
        SvgAttributes.getNumberFromMarkup({ attributes: chair, name: "width" }),
    );
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cy" }),
      SvgAttributes.getNumberFromMarkup({ attributes: chair, name: "y" }),
    );
  });
});

test("response tail clears every painted line of accepted dense colleague names", () => {
  ["V".repeat(18), `界 ${"界".repeat(14)} 界`, "é👩‍🔬é👩‍🔬é"].forEach(
    (colleague) => {
      return _assertResponseTailClearsEveryColleague(colleague);
    },
  );
});

test("serialized controls preserve the reviewed pre-extraction bounds and message identities", () => {
  assert.equal(
    createHash("sha256")
      .update(JSON.stringify(supportRequestResponseContract.controls))
      .digest("hex"),
    "553aa8c0194e176dfb9e8632621c4e4b315fb4328d90d2fdfdba612cd4d94111",
  );
});
