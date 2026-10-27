import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { registerStockLocalizationAssertions } from "../../../../../tests/helpers/registerStockLocalizationAssertions";
import { registerStockPresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import {
  DEFAULT_INPUT,
  FIXTURES,
  invalidInputs,
} from "../SchemaPlanLocalExecution.fixtures";
import { inputSchema } from "../SchemaPlanLocalExecution.schema";
import {
  render,
  options,
  _getTextLineBounds,
  _getCardBounds,
  _assertSeparate,
} from "./SchemaPlanLocalExecutionTestHelpers";

test("all authored fixtures are accepted and every rejection fixture fails", () => {
  FIXTURES.forEach(({ input }) =>
    assert.deepEqual(inputSchema.parse(input), input),
  );
  invalidInputs.forEach((input) =>
    assert.equal(
      inputSchema.safeParse(input).success,
      false,
      JSON.stringify(input),
    ),
  );
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

registerStockLocalizationAssertions({
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
    const input = { ...FIXTURES[2].input, showRows };
    [13, 34.5, 55, 56, 78.5, 100, 120, 150].forEach((frame) => {
      const markup = render({ frame: frame, input: input }),
        boundary = SvgAttributes.fromMarker({
          markup,
          marker: "local-boundary",
        });
      const edge =
        SvgAttributes.getNumberFromMarkup({ attributes: boundary, name: "x" }) +
        SvgAttributes.getNumberFromMarkup({
          attributes: boundary,
          name: "width",
        });
      [...markup.matchAll(/<rect[^>]*data-row-body="[^"]*"[^>]*>/g)].forEach(
        ([row]) => {
          assert.ok(
            SvgAttributes.getNumberFromMarkup({ attributes: row, name: "x" }) >=
              SvgAttributes.getNumberFromMarkup({
                attributes: boundary,
                name: "x",
              }),
          );
          assert.ok(
            SvgAttributes.getNumberFromMarkup({ attributes: row, name: "x" }) +
              SvgAttributes.getNumberFromMarkup({
                attributes: row,
                name: "width",
              }) <
              edge,
          );
        },
      );
      const start = markup.indexOf('<g data-outbound="true"');
      const end = markup.indexOf('<g data-inbound="true"');
      const outbound = markup.slice(start, end);
      assert.doesNotMatch(
        outbound,
        /data-raw-value=|data-local-row=|data-literal-value=/,
      );
      assert.ok(outbound.includes(`aria-label="${input.request.question}"`));
      assert.ok(outbound.includes(`aria-label="${input.columns.category}"`));
      assert.ok(outbound.includes(`aria-label="${input.columns.measure}"`));
      assert.equal((markup.match(/data-row-body=/g) || []).length, 6);
    });
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
    (_, sampleIndex) => 1 + sampleIndex * 1,
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
    [30, 55, 90, 150].forEach((frame) =>
      assert.doesNotThrow(() => render({ frame: frame, input: input })),
    );
  });
});

test("the complete returning plan avoids every retained header line throughout transit and hold", () => {
  FIXTURES.forEach(({ input }) => {
    Array.from(
      { length: Math.max(0, Math.floor((167 - 56) / 1) + 1) },
      (_, sampleIndex) => 56 + sampleIndex * 1,
    ).forEach((frame) => {
      const markup = render({ frame: frame, input: input });
      const card = _getCardBounds({ markup, kind: "inbound" });
      const tableStart = markup.indexOf('data-local-table="true"');
      const firstRow = markup.indexOf("data-local-row=", tableStart);
      const headers = _getTextLineBounds({
        markup: markup.slice(tableStart, firstRow),
      });
      assert.ok(headers.length >= 2);
      headers.forEach((header) =>
        _assertSeparate({
          first: card,
          second: header,
          context: `frame ${frame}: plan/header`,
        }),
      );
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
      boundaryLabels: Object.fromEntries(
        Object.keys(DEFAULT_INPUT.boundaryLabels).map((key) => [
          key,
          words.slice(0, 30),
        ]),
      ),
    });
  });
  [...FIXTURES.map(prop("input")), ...stress].forEach((input) => {
    Array.from(
      { length: Math.max(0, Math.floor((167 - 56) / 3) + 1) },
      (_, sampleIndex) => 56 + sampleIndex * 3,
    ).forEach((frame) => {
      const markup = render({ frame: frame, input: input }),
        inbound = _getCardBounds({ markup, kind: "inbound" }),
        outbound = _getCardBounds({ markup, kind: "outbound" });
      _assertSeparate({
        first: inbound,
        second: outbound,
        context: `frame ${frame}: exchange cards`,
      });
      [inbound, outbound].forEach((card) => {
        const lines = _getTextLineBounds({
          markup: card.markup,
          x: card.left,
          y: card.top,
        });
        assert.ok(lines.length);
        lines.forEach((line) =>
          assert.ok(
            line.left >= card.left &&
              line.right <= card.right &&
              line.top >= card.top &&
              line.bottom <= card.bottom,
            `frame ${frame}: complete card text ${JSON.stringify(line)}`,
          ),
        );
        const tableStart = markup.indexOf('data-local-table="true"');
        _getTextLineBounds({ markup: markup.slice(0, tableStart) }).forEach(
          (caption) =>
            _assertSeparate({
              first: card,
              second: caption,
              context: `frame ${frame}: card/caption`,
            }),
        );
        [...markup.matchAll(/<rect[^>]*data-row-body="[^"]*"[^>]*>/g)].forEach(
          ([row]) => {
            const left = SvgAttributes.getNumberFromMarkup({
                attributes: row,
                name: "x",
              }),
              top = SvgAttributes.getNumberFromMarkup({
                attributes: row,
                name: "y",
              });
            _assertSeparate({
              first: card,
              second: {
                left,
                top,
                right:
                  left +
                  SvgAttributes.getNumberFromMarkup({
                    attributes: row,
                    name: "width",
                  }),
                bottom:
                  top +
                  SvgAttributes.getNumberFromMarkup({
                    attributes: row,
                    name: "height",
                  }),
              },
              context: `frame ${frame}: retained row`,
            });
          },
        );
      });
    });
  });
});
