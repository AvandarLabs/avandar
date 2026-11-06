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
import { RecurringLeakPrevention } from "./RecurringLeakPrevention";
import { recurringLeakPreventionContract } from "./RecurringLeakPrevention.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./RecurringLeakPrevention.fixtures";
import { inputSchema, type Input } from "./RecurringLeakPrevention.schema";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";

function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(RecurringLeakPrevention, {
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
test("retest resumes actual outlet flow without turning an untested repair into success", () => {
  ["stopped", "still-leaking", "not-tested"].forEach((retest) => {
    const input: Input = {
      ...DEFAULT_INPUT,
      repair: { ...DEFAULT_INPUT.repair, gesture: "tighten" },
      retest: retest as Input["retest"],
      showPhaseCaptions: false,
    };
    const setup = render({ frame: 30, input: input });
    const repair = render({ frame: 90, input: input });
    const hold = render({ frame: 150, input: input });
    assert.match(setup, /data-outlet-flow=/);
    assert.match(setup, /data-side-leak=/);
    assert.doesNotMatch(repair, /data-outlet-flow=/);
    const hand = SvgAttributes.fromMarker({
      markup: repair,
      marker: "repair-hand",
    });
    const joint = SvgAttributes.fromMarker({
      markup: repair,
      marker: "joint-repair",
    });
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cx" }),
      SvgAttributes.getNumberFromMarkup({ attributes: joint, name: "cx" }),
    );
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cy" }),
      SvgAttributes.getNumberFromMarkup({ attributes: joint, name: "cy" }),
    );
    assert.equal(hold.includes("data-outlet-flow="), retest !== "not-tested");
    assert.equal(hold.includes("data-side-leak="), retest === "still-leaking");
    const label =
      retest === "stopped"
        ? input.labels.stopped
        : retest === "still-leaking"
          ? input.labels.continued
          : input.labels.untested;
    assert.ok(hold.includes(`aria-label="${label}"`));
    assert.match(hold, /data-catch-tray=/);
  });
});

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.fixtureLabel,
    input.workerLabel,
    input.labels.example,
    ...(frame >= 75 ? [input.repair.label] : []),
    ...(frame >= 119
      ? [
          input.retest === "stopped"
            ? input.labels.stopped
            : input.retest === "still-leaking"
              ? input.labels.continued
              : input.labels.untested,
        ]
      : []),
    ...(input.showPhaseCaptions && frame >= 49
      ? [
          frame < 63
            ? input.labels.containment
            : frame < 107 || input.retest === "not-tested"
              ? input.labels.repair
              : input.labels.test,
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
  contract: recurringLeakPreventionContract,
  render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
  textFrames: [50, 90, 150],
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(options);
registerStockTextLayoutAssertions(options);
test("every indexed default-copy path resolves while authored input remains exact", () => {
  const contract = recurringLeakPreventionContract;
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

test("the worker hand stays on the actual seal during insertion", () => {
  [82, 90, 101, 106].forEach((frame) => {
    const markup = render({ frame: frame, input: DEFAULT_INPUT });
    const hand = SvgAttributes.fromMarker({ markup, marker: "repair-hand" });
    const seal = SvgAttributes.fromMarker({
      markup,
      marker: "replacement-seal",
    });
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cx" }),
      SvgAttributes.getNumberFromMarkup({ attributes: seal, name: "x" }) +
        SvgAttributes.getNumberFromMarkup({ attributes: seal, name: "width" }) /
          2,
    );
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cy" }),
      SvgAttributes.getNumberFromMarkup({ attributes: seal, name: "y" }) +
        SvgAttributes.getNumberFromMarkup({
          attributes: seal,
          name: "height",
        }) /
          2,
    );
  });
});

test("copy extraction includes every explicit indexed default without changing author input", () => {
  const contract = recurringLeakPreventionContract;
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

test("the tray covers the real leak while the successful retest outlet remains unobstructed", () => {
  const markup = render({ frame: 150, input: DEFAULT_INPUT });
  const tray = SvgAttributes.fromMarker({ markup, marker: "catch-tray" });
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: tray, name: "x" }) < 480,
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: tray, name: "x" }) +
      SvgAttributes.getNumberFromMarkup({ attributes: tray, name: "width" }) >
      480,
  );
  const flow = markup.match(/<g data-outlet-flow="true">([\s\S]*?)<\/g>/)?.[1];
  assert.ok(flow);
  assert.match(flow, /d="M220 260 H735 V430"/);
  assert.match(flow, /fill="none"/);
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: tray, name: "x" }) +
      SvgAttributes.getNumberFromMarkup({ attributes: tray, name: "width" }) <
      735,
  );
  assert.doesNotMatch(markup, /data-side-leak=/);
});

test("supplied multilingual prose and literal punctuation remain unchanged", () => {
  const supplied = { ...DEFAULT_INPUT, fixtureLabel: "R&D <x>\t界\n👩‍🔬" };
  assert.deepEqual(inputSchema.parse(supplied), supplied);
  assert.ok(
    render({ frame: 90, input: supplied }).includes(
      'aria-label="R&amp;D &lt;x&gt;\t界\n👩‍🔬"',
    ),
  );
});

test("an unperformed retest retains repair copy and never paints a performed test phase", () => {
  [true, false].forEach((showPhaseCaptions) =>
    [120, 150, 167].forEach((frame) => {
      const markup = render({
        frame: frame,
        input: {
          ...DEFAULT_INPUT,
          retest: "not-tested",
          showPhaseCaptions,
        },
      });
      assert.ok(
        markup.includes(`aria-label="${DEFAULT_INPUT.labels.untested}"`),
      );
      assert.doesNotMatch(markup, /data-outlet-flow=/);
      assert.ok(!markup.includes(`aria-label="${DEFAULT_INPUT.labels.test}"`));
      const phase = markup.match(
        /<g data-phase-caption="true"[^>]*>([\s\S]*?)<\/g>/,
      )?.[1];
      assert.equal(Boolean(phase), showPhaseCaptions);
      if (phase) {
        assert.ok(
          phase.includes(`aria-label="${DEFAULT_INPUT.labels.repair}"`),
        );
      }
    }),
  );
});

test("serialized controls preserve the reviewed pre-extraction bounds and message identities", () => {
  assert.equal(
    createHash("sha256")
      .update(JSON.stringify(recurringLeakPreventionContract.controls))
      .digest("hex"),
    "fd767d3c6cdc7924705d227bd53b865a0e9f393e7e116ddc7ac327d53ba2968d",
  );
});
