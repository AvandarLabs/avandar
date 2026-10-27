import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RejectAndReplace } from "./RejectAndReplace";
import { rejectAndReplaceContract } from "./RejectAndReplace.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./RejectAndReplace.fixtures";
import { inputSchema } from "./RejectAndReplace.schema";
/** Inputs for render. */
type RenderInput = {
  criterion: string;
  rejected: { label: string; reason: string };
  replacement: { label: string; reason: string };
  decisionLabels: { rejected: string; selected: string };
  showCriterionLink: boolean;
  rejectionMark: "cross" | "strike";
};

function _render({
  frame,
  input = DEFAULT_INPUT,
}: {
  frame: number;
  input?: RenderInput;
}): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      { viewBox: "0 0 960 600" },
      createElement(RejectAndReplace, {
        frame,
        input,
        accent: "#aabbcc",
        id: "test",
      }),
    ),
  );
}

test("the replacement occupies the original selection slot while the rejected rationale stays readable", () => {
  const initial = _render({ frame: 30 });
  const hold = _render({ frame: 150 });
  assert.match(
    initial,
    /data-option="rejected"[^>]*transform="translate\(480 0\)"/,
  );
  assert.match(
    hold,
    /data-option="replacement"[^>]*transform="translate\(480 0\)"/,
  );
  assert.match(
    hold,
    /data-option="rejected"[^>]*transform="translate\(156 0\)"/,
  );
  [
    DEFAULT_INPUT.rejected.label,
    DEFAULT_INPUT.rejected.reason,
    DEFAULT_INPUT.replacement.label,
    DEFAULT_INPUT.replacement.reason,
  ].forEach((text) => assert.ok(hold.includes(text)));
  assert.match(hold, /data-rejection-mark="strike"/);
});

test("rejection styles change the selection marker rather than striking the rationale", () => {
  const strike = _render({ frame: 150 });
  const cross = _render({
    frame: 150,
    input: {
      ...DEFAULT_INPUT,
      rejectionMark: "cross",
      showCriterionLink: false,
    },
  });
  const path = (markup: string) =>
    markup.match(/data-rejection-mark="[^"]+"[^>]*><path d="([^"]+)"/)?.[1];
  assert.ok(path(strike));
  assert.ok(path(cross));
  assert.notEqual(path(strike), path(cross));
  assert.match(strike, /data-criterion-link=/);
  assert.doesNotMatch(cross, /data-criterion-link=/);
  assert.ok(cross.includes(DEFAULT_INPUT.rejected.reason));
});

test("default, minimum, dense and changed selections retain complete content during backward seeks", () => {
  assert.deepEqual(fixtures.map(prop("id")), [
    "default",
    "minimum",
    "dense",
    "changed",
  ]);
  fixtures.forEach(({ input }) => {
    assert.deepEqual(inputSchema.parse(input), input);
    const frames = [0, 30, 60, 90, 150, 179];
    const samples = frames.map((frame) => _render({ frame, input }));
    [...frames]
      .reverse()
      .forEach((frame) =>
        assert.equal(_render({ frame, input }), samples[frames.indexOf(frame)]),
      );
    [
      input.criterion,
      input.rejected.label,
      input.rejected.reason,
      input.replacement.label,
      input.replacement.reason,
    ].forEach((text) =>
      assert.ok(
        _render({ frame: 150, input }).includes(`aria-label="${text}"`),
      ),
    );
  });
});

test("strict choice content rejects missing rationale and extra object keys", () => {
  invalidInputs.forEach((input) =>
    assert.equal(inputSchema.safeParse(input).success, false),
  );
  assert.equal(inputSchema.safeParse({}).success, false);
});

test("the complete contract exposes both rationale objects and valid complete binding", () => {
  assert.deepEqual(rejectAndReplaceContract.defaultInput, DEFAULT_INPUT);
  assert.equal(rejectAndReplaceContract.jsonSchema.additionalProperties, false);
  assert.deepEqual(
    rejectAndReplaceContract.controls.map(prop("path")),
    Object.keys(DEFAULT_INPUT),
  );
  rejectAndReplaceContract.bindingExamples.forEach(({ input }) =>
    assert.equal(inputSchema.safeParse(input).success, true),
  );
});

test("both accepted spaced rationales fit four lines while hard breaks remain in authored input", async () => {
  const { textRegressionInputs } = await import("./RejectAndReplace.fixtures");
  textRegressionInputs.forEach(({ id, input, text }) => {
    assert.deepEqual(inputSchema.parse(input), input, id);
    const markup = _render({ frame: 150, input });
    assert.ok(markup.includes(`aria-label="${text}"`), id);
    if (id !== "all-label-breaks") {
      assert.ok(markup.includes(`>${"界".repeat(7)}`), id);
    }
  });
});

Array.from(["replacement", "rejected"] as const).forEach((field) => {
  test(`the ${field} rationale packs a short prefix with both oversized tokens`, () => {
    const text = [1, 16, 16].map((length) => "界".repeat(length)).join(" ");
    const input = {
      ...DEFAULT_INPUT,
      [field]: { ...DEFAULT_INPUT[field], reason: text },
    };
    assert.deepEqual(inputSchema.parse(input), input);
    const markup = _render({ frame: 150, input });
    assert.ok(markup.includes(`aria-label="${text}"`));
    const copy = markup.match(
      new RegExp(`<text[^>]*aria-label="${text}"[^>]*>(.*?)</text>`),
    );
    assert.ok(copy);
    assert.ok((copy[1].match(/<tspan/g) ?? []).length <= 4);
  });
});
