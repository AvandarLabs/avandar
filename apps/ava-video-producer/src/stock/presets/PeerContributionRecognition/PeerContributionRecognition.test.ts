/** Semantic geometry assertions for the authored study. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { prop } from "@avandar/utils";
import { setupI18n } from "@lingui/core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { makeLocalizedStockDataFromContract } from "../../i18n/makeLocalizedStockDataFromContract";
import { StockCopyMessages } from "../../i18n/StockCopyMessages";
import { PeerContributionRecognition } from "./PeerContributionRecognition";
import { peerContributionRecognitionContract } from "./PeerContributionRecognition.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./PeerContributionRecognition.fixtures";
import { inputSchema, type Input } from "./PeerContributionRecognition.schema";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(PeerContributionRecognition, {
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
test("focus moves the pointing fingertip and acknowledgment anchor to the authored object", () => {
  const input = fixtures[3].input;
  input.contributions.forEach((contribution) => {
    const focused = { ...input, focusedContributionId: contribution.id };
    const point = SvgAttributes.fromMarker({
      markup: render({ frame: 78, input: focused }),
      marker: "pointing-hand",
    });
    const object = SvgAttributes.fromMarker({
      markup: render({ frame: 78, input: focused }),
      marker: "focused-object",
    });
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: point, name: "cx" }),
      SvgAttributes.getNumberFromMarkup({ attributes: object, name: "x" }) +
        SvgAttributes.getNumberFromMarkup({
          attributes: object,
          name: "width",
        }) /
          2,
    );
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: point, name: "cy" }),
      SvgAttributes.getNumberFromMarkup({ attributes: object, name: "y" }) +
        SvgAttributes.getNumberFromMarkup({
          attributes: object,
          name: "height",
        }),
    );
    const hold = render({ frame: 150, input: focused });
    const acknowledgment = SvgAttributes.fromMarker({
      markup: hold,
      marker: "acknowledgment-anchor",
    });
    assert.equal(
      SvgAttributes.getNumberFromMarkup({
        attributes: acknowledgment,
        name: "x1",
      }),
      SvgAttributes.getNumberFromMarkup({ attributes: object, name: "x" }) +
        SvgAttributes.getNumberFromMarkup({
          attributes: object,
          name: "width",
        }) /
          2,
    );
    assert.ok(hold.includes(`aria-label="${input.people.contributor}"`));
    assert.ok(hold.includes(`aria-label="${input.acknowledgment.text}"`));
    assert.match(hold, /data-authorship-byline="true"/);
    assert.doesNotMatch(hold, /data-authorship-tab=/);
  });
});

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.people.contributor,
    input.people.colleague,
    input.exampleLabel,
    ...input.contributions.map(prop("label")),
    ...(frame >= 109 ? [input.acknowledgment.text] : []),
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
  contract: peerContributionRecognitionContract,
  render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
  textFrames: [50, 90, 150],
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(options);
registerStockTextLayoutAssertions(options);
test("every indexed default-copy path resolves while authored input remains exact", () => {
  const contract = peerContributionRecognitionContract;
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
  const contract = peerContributionRecognitionContract;
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

test("hidden authorship stays visibly beside the focused stationary work throughout hold", () => {
  [0, 1].forEach((index) => {
    const input = {
      ...fixtures[3].input,
      focusedContributionId: fixtures[3].input.contributions[index].id,
    };
    const setup = SvgAttributes.fromMarker({
      markup: render({ frame: 30, input: input }),
      marker: "focused-object",
    });
    [129, 140, 150, 167].forEach((frame) => {
      const markup = render({ frame: frame, input: input });
      const object = SvgAttributes.fromMarker({
        markup,
        marker: "focused-object",
      });
      ["x", "y", "width", "height"].forEach((attribute) =>
        assert.equal(
          SvgAttributes.getNumberFromMarkup({
            attributes: object,
            name: attribute,
          }),
          SvgAttributes.getNumberFromMarkup({
            attributes: setup,
            name: attribute,
          }),
        ),
      );
      const byline = markup.match(
        /<g data-authorship-byline="true">([\s\S]*?)<\/g>/,
      )?.[1];
      assert.ok(byline?.includes(`aria-label="${input.people.contributor}"`));
      const text = byline!.match(/<text[^>]*>/)?.[0];
      assert.ok(text);
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: text, name: "x" }),
        SvgAttributes.getNumberFromMarkup({ attributes: object, name: "x" }),
      );
      assert.ok(
        SvgAttributes.getNumberFromMarkup({ attributes: text, name: "y" }) -
          14 >
          SvgAttributes.getNumberFromMarkup({ attributes: object, name: "y" }) +
            SvgAttributes.getNumberFromMarkup({
              attributes: object,
              name: "height",
            }),
      );
    });
  });
});

test("supplied multilingual prose and literal punctuation remain unchanged", () => {
  const supplied = { ...DEFAULT_INPUT, exampleLabel: "R&D <x>\t界\n👩‍🔬" };
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
      people: { contributor: label, colleague: "V".repeat(18) },
    });
    const markup = render({ frame: 150, input: input });
    assert.ok(markup.includes(`aria-label="${label}"`));
    assert.ok(markup.includes(`aria-label="${input.people.colleague}"`));
  });
});

test("complete contribution captions clear both acknowledgment containers and their objects", () => {
  [
    DEFAULT_INPUT,
    fixtures[2].input,
    {
      ...fixtures[2].input,
      contributions: fixtures[2].input.contributions.map((item) => ({
        ...item,
        label: `界 ${"界".repeat(9)} ${"界".repeat(28)}`.slice(0, 28),
      })),
      acknowledgment: {
        ...fixtures[2].input.acknowledgment,
        text: `界 ${"界".repeat(27)} ${"界".repeat(52)}`.slice(0, 52),
      },
    },
  ].forEach((input) =>
    ["spoken", "note"].forEach((form) => {
      [96, 128, 150].forEach((frame) => {
        const markup = render({
          frame: frame,
          input: {
            ...input,
            acknowledgment: {
              ...input.acknowledgment,
              form: form as Input["acknowledgment"]["form"],
            },
          },
        });
        const bubble = SvgAttributes.fromMarker({
          markup,
          marker: "acknowledgment-box",
        });
        const bottom =
          SvgAttributes.getNumberFromMarkup({ attributes: bubble, name: "y" }) +
          SvgAttributes.getNumberFromMarkup({
            attributes: bubble,
            name: "height",
          }) +
          0.5;
        [
          ...markup.matchAll(
            /<g data-contribution-caption="[^"]*">([\s\S]*?)<\/g>/g,
          ),
        ].forEach(([, group]) => {
          const text = group.match(/<text([^>]*)>([\s\S]*?)<\/text>/);
          assert.ok(text);
          const baseline = SvgAttributes.getNumberFromMarkup({
            attributes: text[1],
            name: "y",
          });
          const fontSize = SvgAttributes.getNumberFromMarkup({
            attributes: text[1],
            name: "font-size",
          });
          const lineOffset = [...text[2].matchAll(/<tspan([^>]*)>/g)].reduce(
            (offset, [, spanAttributes]) =>
              offset + Number(spanAttributes.match(/ dy="([^"]*)"/)?.[1] ?? 0),
            0,
          );
          assert.ok(
            baseline - fontSize > bottom,
            `${baseline - fontSize} <= acknowledgment bottom ${bottom}`,
          );
          const object = SvgAttributes.fromMarker({
            markup,
            marker: "focused-object",
          });
          assert.ok(
            baseline + lineOffset + fontSize * 0.3 <
              SvgAttributes.getNumberFromMarkup({
                attributes: object,
                name: "y",
              }) -
                1,
          );
        });
      });
    }),
  );
});

test("serialized controls preserve the reviewed pre-extraction bounds and message identities", () => {
  assert.equal(
    createHash("sha256")
      .update(JSON.stringify(peerContributionRecognitionContract.controls))
      .digest("hex"),
    "b04fa4551c3d1cb9b89aba289936696e45c011b9d3b1e6bd954b629302c6b5d4",
  );
});
