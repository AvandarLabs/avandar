/** Semantic geometry assertions for the authored study. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { setupI18n } from "@lingui/core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { makeLocalizedStockDataFromContract } from "../../i18n/makeLocalizedStockDataFromContract";
import { StockCopyMessages } from "../../i18n/StockCopyMessages";
import { getConservativeWidthFromText } from "../../text/getConservativeWidthFromText";
import { SupportRequestResponse } from "./SupportRequestResponse";
import { supportRequestResponseContract } from "./SupportRequestResponse.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./SupportRequestResponse.fixtures";
import { inputSchema, type Input } from "./SupportRequestResponse.schema";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(SupportRequestResponse, {
      frame,
      input,
      accent: "#6ee7c4",
      id: "test",
    }),
  );
}
const render: ({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>) => string = _render;
test("complete rejection fixtures reject structural and reference violations", () =>
  invalidInputs.forEach((input) =>
    assert.equal(inputSchema.safeParse(input).success, false),
  ));
test("only joins brings a second chair and contacting hand to the still-open owner task", () => {
  ["joins", "later", "declines"].forEach((state) => {
    const input: Input = {
      ...DEFAULT_INPUT,
      showRequestAtHold: false,
      response: {
        state: state as Input["response"]["state"],
        text: `Supplied ${state}`,
      },
    };
    const setup = render({ frame: 30, input: input });
    const hold = render({ frame: 150, input: input });
    assert.doesNotMatch(setup, /data-second-chair=/);
    assert.equal(hold.includes("data-second-chair="), state === "joins");
    assert.ok(hold.includes(`aria-label="${input.response.text}"`));
    assert.ok(hold.includes(`aria-label="${input.people.requester}"`));
    assert.ok(hold.includes(`aria-label="${input.labels.open}"`));
    assert.doesNotMatch(hold, /data-completed=/);
    const task = SvgAttributes.fromMarker({
      markup: hold,
      marker: "unfinished-task",
    });
    assert.ok(task.includes(`data-owner="${input.people.requester}"`));
    if (state === "joins") {
      const hand = SvgAttributes.fromMarker({
        markup: hold,
        marker: "shared-hand",
      });
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cx" }),
        SvgAttributes.getNumberFromMarkup({ attributes: task, name: "x" }) +
          SvgAttributes.getNumberFromMarkup({
            attributes: task,
            name: "width",
          }),
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cy" }),
        SvgAttributes.getNumberFromMarkup({ attributes: task, name: "y" }) +
          SvgAttributes.getNumberFromMarkup({
            attributes: task,
            name: "height",
          }),
      );
    }
  });
});

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.people.requester,
    input.people.colleague,
    input.task.label,
    input.labels.ownedBy,
    input.labels.open,
    input.labels.example,
    ...(frame < 131 || input.showRequestAtHold ? [input.requestText] : []),
    ...(frame >= 63 ? [input.response.text] : []),
    ...(frame >= 139 && input.response.state === "joins"
      ? [input.labels.shared]
      : []),
  ];
}
const EXCLUDED_TEXT_FIELDS: string[] = [
  "id",
  "expertId",
  "focusedContributionId",
  "demonstration",
  "tableArrangement",
  "artifact",
  "kind",
  "form",
  "state",
  "gesture",
  "retest",
  "releaseRole",
  "issueMarks",
  "contributor",
  "colleague",
  "requester",
];
const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: supportRequestResponseContract,
  render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
  textFrames: [50, 90, 150],
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(options);
registerStockTextLayoutAssertions(options);
test("every indexed default-copy path resolves while authored input remains exact", () => {
  const contract = supportRequestResponseContract;
  const supplied = structuredClone(DEFAULT_INPUT);
  const messages = Object.fromEntries(
    contract.defaultTextPaths.map((path, index) => [
      StockCopyMessages.getDefaultMessageIdFromPath({ id: contract.id, path }),
      `Traduit ${index}`,
    ]),
  );
  const i18n = setupI18n({ locale: "fr", messages: { fr: messages } });
  const resolved = makeLocalizedStockDataFromContract({ contract, i18n });
  contract.defaultTextPaths.forEach((path, index) => {
    const value = path.reduce<unknown>(
      (parent, key) => Reflect.get(parent as object, key),
      resolved.defaultInput,
    );
    assert.equal(value, `Traduit ${index}`);
  });
  assert.deepEqual(DEFAULT_INPUT, supplied);
  assert.notEqual(resolved.defaultInput, DEFAULT_INPUT);
});

test("copy extraction includes every explicit indexed default without changing author input", () => {
  const contract = supportRequestResponseContract;
  const messages = StockCopyMessages.getMessagesFromContract({
    [contract.id]: contract,
  });
  contract.defaultTextPaths.forEach((path) => {
    const original = path.reduce<unknown>(
      (parent, key) => Reflect.get(parent as object, key),
      DEFAULT_INPUT,
    );
    assert.equal(
      messages[
        StockCopyMessages.getDefaultMessageIdFromPath({ id: contract.id, path })
      ],
      original,
    );
  });
});

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
      ["joins", "later", "declines"].forEach((state) =>
        [50, 90, 110, 150].forEach((frame) => {
          const input = inputSchema.parse({
            ...fixtures[2].input,
            people: { ...fixtures[2].input.people, colleague },
            response: { ...fixtures[2].input.response, state },
          });
          const markup = render({ frame: frame, input: input });
          const tail = SvgAttributes.fromMarker({
            markup,
            marker: "response-tail",
          });
          const coordinates = tail.match(
            / d="M([^ ]+) ([^ ]+) l([^ ]+) ([^ ]+) l([^ ]+) ([^"]+)"/,
          );
          assert.ok(coordinates);
          const [x, y, dx, dy, endX, endY] = coordinates.slice(1).map(Number);
          const tailBox = {
            left: Math.min(x, x + dx, x + dx + endX) - 0.5,
            right: Math.max(x, x + dx, x + dx + endX) + 0.5,
            top: Math.min(y, y + dy, y + dy + endY) - 0.5,
            bottom: Math.max(y, y + dy, y + dy + endY) + 0.5,
          };
          const group = markup.match(
            /<g data-colleague-name="true">([\s\S]*?)<\/g>/,
          )?.[1];
          assert.ok(group);
          const text = group.match(/<text([^>]*)>([\s\S]*?)<\/text>/);
          assert.ok(text);
          const fontSize = SvgAttributes.getNumberFromMarkup({
            attributes: text[1],
            name: "font-size",
          });
          assert.equal(fontSize, 20);
          const spans = [
            ...text[2].matchAll(/<tspan([^>]*)>([^<]*)<\/tspan>/g),
          ];
          assert.equal(
            spans
              .map(([, , line]) => line)
              .join("")
              .replace(/\s/gu, ""),
            colleague.replace(/\s/gu, ""),
          );
          spans.forEach(([, attributes, line], index) => {
            assert.doesNotMatch(line, /^[\u0300-\u036f\u200d]/u);
            const left = SvgAttributes.getNumberFromMarkup({
              attributes,
              name: "x",
            });
            const top =
              SvgAttributes.getNumberFromMarkup({
                attributes: text[1],
                name: "y",
              }) +
              spans
                .slice(0, index + 1)
                .reduce(
                  (offset, [, spanAttributes]) =>
                    offset +
                    Number(spanAttributes.match(/ dy="([^"]*)"/)?.[1] ?? 0),
                  0,
                ) -
              fontSize;
            const right =
              left + getConservativeWidthFromText({ text: line, fontSize });
            const bottom = top + fontSize * 1.3;
            assert.ok(
              right < tailBox.left ||
                left > tailBox.right ||
                bottom < tailBox.top ||
                top > tailBox.bottom,
              `tail intersects colleague line ${index}`,
            );
          });
        }),
      );
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
