/** Semantic geometry assertions for the authored study. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { propEq } from "@avandar/utils";
import { setupI18n } from "@lingui/core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { makeLocalizedStockDataFromContract } from "../../i18n/makeLocalizedStockDataFromContract";
import { StockCopyMessages } from "../../i18n/StockCopyMessages";
import { ExpertiseRoleExchange } from "./ExpertiseRoleExchange";
import { expertiseRoleExchangeContract } from "./ExpertiseRoleExchange.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./ExpertiseRoleExchange.fixtures";
import { inputSchema, type Input } from "./ExpertiseRoleExchange.schema";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(ExpertiseRoleExchange, {
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
test("expert changes move the demonstrating hand while identity labels stay attached", () => {
  [DEFAULT_INPUT, fixtures[3].input].forEach((input) => {
    [65, 120].forEach((frame, topicIndex) => {
      const markup = render({ frame: frame, input: input });
      const hand = SvgAttributes.fromMarker({
        markup,
        marker: "demonstrating-hand",
      });
      const tool = SvgAttributes.fromMarker({
        markup,
        marker: "demonstration-tool",
      });
      assert.ok(
        hand.includes(`data-person-id="${input.topics[topicIndex].expertId}"`),
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cx" }),
        SvgAttributes.getNumberFromMarkup({ attributes: tool, name: "x" }),
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cy" }),
        SvgAttributes.getNumberFromMarkup({ attributes: tool, name: "y" }),
      );
      input.people.forEach((person) => {
        const personGroup = markup
          .match(/<g data-person-id="[^"]*"[\s\S]*?<\/g>/g)
          ?.find((group) => group.includes(`data-person-id="${person.id}"`));
        assert.ok(personGroup?.includes(`aria-label="${person.label}"`));
        assert.ok(personGroup?.includes(`aria-label="${person.roleLabel}"`));
      });
    });
  });
  const hidden = render({
    frame: 150,
    input: { ...DEFAULT_INPUT, showJobRoles: false },
  });
  DEFAULT_INPUT.people.forEach((person) =>
    assert.ok(hidden.includes(`aria-label="${person.label}"`)),
  );
});

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    ...input.people.flatMap((person) => [
      person.label,
      ...(input.showJobRoles ? [person.roleLabel] : []),
    ]),
    input.labels.example,
    ...(frame >= 35
      ? [
          input.topics[frame < 83 ? 0 : 1].label,
          input.labels.demonstrates,
          input.labels.learns,
        ]
      : []),
    ...(frame >= 139
      ? [
          ...input.topics.flatMap((topic) => [
            topic.label,
            input.people.find(propEq("id", topic.expertId))!.label,
          ]),
          input.closingLabel,
        ]
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
];
const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: expertiseRoleExchangeContract,
  render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
  textFrames: [50, 90, 150],
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(options);
registerStockTextLayoutAssertions(options);
test("every indexed default-copy path resolves while authored input remains exact", () => {
  const contract = expertiseRoleExchangeContract;
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

test("both hands meet the moving tool during its handoff", () => {
  [DEFAULT_INPUT, fixtures[3].input].forEach((input) => {
    const markup = render({ frame: 93, input: input });
    const tool = SvgAttributes.fromMarker({
      markup,
      marker: "demonstration-tool",
    });
    const hands = [
      ...markup.matchAll(/<circle data-transfer-hand="true"[^>]*>/g),
    ];
    assert.equal(hands.length, 2);
    hands.forEach(([attributes]) => {
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes, name: "cx" }),
        SvgAttributes.getNumberFromMarkup({ attributes: tool, name: "x" }),
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes, name: "cy" }),
        SvgAttributes.getNumberFromMarkup({ attributes: tool, name: "y" }),
      );
    });
  });
});

test("side-by-side people share the table edge while opposite sides flank its ends", () => {
  ["side-by-side", "opposite-sides"].forEach((tableArrangement) => {
    const markup = render({
      frame: 65,
      input: {
        ...DEFAULT_INPUT,
        tableArrangement: tableArrangement as Input["tableArrangement"],
      },
    });
    const positions = [
      ...markup.matchAll(/transform="translate\(([^ ]+) 290\) scale\(1.5\)"/g),
    ].map((match) => Number(match[1]));
    assert.equal(positions.length, 2);
    if (tableArrangement === "side-by-side") {
      positions.forEach((x) => assert.ok(x > 290 && x < 675));
    } else {
      assert.ok(positions[0] < 290);
      assert.ok(positions[1] > 675);
    }
  });
});

test("copy extraction includes every explicit indexed default without changing author input", () => {
  const contract = expertiseRoleExchangeContract;
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

test("supplied multilingual prose and literal punctuation remain unchanged", () => {
  const supplied = { ...DEFAULT_INPUT, closingLabel: "R&D <x>\t界\n👩‍🔬" };
  assert.deepEqual(inputSchema.parse(supplied), supplied);
  assert.ok(
    render({ frame: 90, input: supplied }).includes(
      'aria-label="R&amp;D &lt;x&gt;\t界\n👩‍🔬"',
    ),
  );
});

test("serialized controls preserve the reviewed pre-extraction bounds and message identities", () => {
  assert.equal(
    createHash("sha256")
      .update(JSON.stringify(expertiseRoleExchangeContract.controls))
      .digest("hex"),
    "9f07f36c94f3385c989cc23ee3cc25fc1a9ff536a8d947307362f753c4710f2a",
  );
});
