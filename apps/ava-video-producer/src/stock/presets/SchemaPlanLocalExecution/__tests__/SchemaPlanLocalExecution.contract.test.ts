import assert from "node:assert/strict";
import test from "node:test";
import { objectValuesMap, prop } from "@avandar/utils";
import { registerStockDefaultTextAssertions } from "../../../../../tests/helpers/registerStockDefaultTextAssertions";
import { registerStockPresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import {
  DEFAULT_INPUT,
  FIXTURES,
  invalidInputs,
} from "../SchemaPlanLocalExecution.fixtures";
import { inputSchema } from "../SchemaPlanLocalExecution.schema";
import { assertActualRawRowsRemainShowRows as _assertActualRawRowsRemainShowRows } from "./assertActualRawRowsRemainShowRows";
import { assertExchangeCardsRetainCompleteInput as _assertExchangeCardsRetainCompleteInput } from "./assertExchangeCardsRetainCompleteInput";
import {
  render,
  options,
  _getTextLineBounds,
  _getCardBounds,
  _assertSeparate,
} from "./SchemaPlanLocalExecutionTestHelpers";

test("all authored fixtures are accepted and every rejection fixture fails", () => {
  FIXTURES.forEach(({ input }) => {
    return assert.deepEqual(inputSchema.parse(input), input);
  });
  invalidInputs.forEach((input) => {
    return assert.equal(
      inputSchema.safeParse(input).success,
      false,
      JSON.stringify(input),
    );
  });
});

test("only supplied schema/question travel while retained rows compute five or ten locally", () => {
  [DEFAULT_INPUT, FIXTURES[3].input].forEach((input, index) => {
    const travelling = render({ frame: 55, input: input }),
      hold = render({ frame: 150, input: input });
    const outbound = travelling.match(
      /<g data-outbound="true"[^>]*>([\s\S]*?)<\/g>/,
    )?.[1];
    assert.ok(outbound);
    assert.ok(outbound.includes(input.request.question));
    assert.doesNotMatch(outbound, /data-local-row=|data-raw-value=/);
    assert.equal((hold.match(/data-local-row=/g) || []).length, 3);
    assert.ok(hold.includes(`data-local-result="${index === 0 ? 5 : 10}"`));
    const result = SvgAttributes.fromMarker({
      markup: hold,
      marker: "local-result",
    });
    assert.ok(
      SvgAttributes.getNumberFromMarkup({ attributes: result, name: "x" }) <
        570,
    );
  });
});

registerStockPresetAssertions(options);

registerStockTextLayoutAssertions(options);

registerStockDefaultTextAssertions({
  contract: options.contract,
  suppliedInputs: FIXTURES.map(prop("input")),
  expectedTextPaths: [
    ["columns", "category"],
    ["columns", "measure"],
    ["request", "question"],
    ["request", "planLabel"],
    ["boundaryLabels", "local"],
    ["boundaryLabels", "remote"],
    ["boundaryLabels", "outbound"],
    ["boundaryLabels", "inbound"],
    ["boundaryLabels", "result"],
    ["copy", "context"],
    ["copy", "before"],
    ["copy", "after"],
  ],
});

test("all actual raw rows remain inside the device throughout outbound and inbound travel", () => {
  [true, false].forEach((showRows) => {
    return _assertActualRawRowsRemainShowRows(showRows);
  });
});

test("exact categories including whitespace select only equal rows and hidden rows retain their sum", () => {
  [" N", "N\t", "N\n", "é", "👩‍🔬"].forEach((category) => {
    const input = inputSchema.parse({
      ...DEFAULT_INPUT,
      rows: [
        { id: "a", category, value: 2 },
        { id: "b", category: `${category}x`, value: 7 },
        { id: "c", category, value: 3 },
      ],
      request: {
        ...DEFAULT_INPUT.request,
        selectedCategory: category,
        question: `Sum ${category}?`,
      },
    });
    const shown = render({ frame: 150, input: input }),
      hidden = render({ frame: 150, input: { ...input, showRows: false } });
    assert.match(shown, /data-local-result="5"/);
    assert.match(hidden, /data-local-result="5"/);
    assert.equal((shown.match(/data-row-selected=/g) || []).length, 2);
    assert.match(shown, /data-literal-value=/);
    assert.doesNotMatch(hidden, /data-raw-value=/);
  });
});

test("maximum supplied question and schema words fit their outbound card without narrowing inputs", () => {
  Array.from(
    { length: Math.max(0, Math.floor((25 - 1) / 1) + 1) },
    (_, sampleIndex) => {
      return 1 + sampleIndex * 1;
    },
  ).forEach((wordLength) => {
    const words = `${"界".repeat(wordLength)} `.repeat(60);
    const input = inputSchema.parse({
      ...FIXTURES[2].input,
      columns: { category: words.slice(0, 20), measure: "V".repeat(20) },
      rows: [
        { id: "a", category: "界", value: 2 },
        { id: "b", category: "other", value: 3 },
      ],
      request: {
        selectedCategory: "界",
        question: words.slice(0, 52),
        planLabel: words.slice(0, 38),
      },
    });
    [30, 55, 90, 150].forEach((frame) => {
      return assert.doesNotThrow(() => {
        return render({ frame: frame, input: input });
      });
    });
  });
});

test("the complete returning plan avoids every retained header line throughout transit and hold", () => {
  FIXTURES.forEach(({ input }) => {
    Array.from(
      { length: Math.max(0, Math.floor((167 - 56) / 1) + 1) },
      (_, sampleIndex) => {
        return 56 + sampleIndex * 1;
      },
    ).forEach((frame) => {
      const markup = render({ frame: frame, input: input });
      const card = _getCardBounds({ markup, kind: "inbound" });
      const tableStart = markup.indexOf('data-local-table="true"');
      const firstRow = markup.indexOf("data-local-row=", tableStart);
      const headers = _getTextLineBounds({
        markup: markup.slice(tableStart, firstRow),
      });
      assert.ok(headers.length >= 2);
      headers.forEach((header) => {
        return _assertSeparate({
          first: card,
          second: header,
          context: `frame ${frame}: plan/header`,
        });
      });
    });
  });
});

test("exchange cards retain complete wrapped text and avoid other cards, captions and raw rows", () => {
  const stress = Array.from({ length: 20 }, (_, index) => {
    const words = `${"界".repeat(index + 1)} `.repeat(40);
    return inputSchema.parse({
      ...FIXTURES[2].input,
      columns: { category: words.slice(0, 20), measure: "V".repeat(20) },
      request: { ...FIXTURES[2].input.request, planLabel: words.slice(0, 38) },
      boundaryLabels: objectValuesMap(DEFAULT_INPUT.boundaryLabels, () => {
        return words.slice(0, 30);
      }),
    });
  });
  [...FIXTURES.map(prop("input")), ...stress].forEach((input) => {
    return _assertExchangeCardsRetainCompleteInput(input);
  });
});
