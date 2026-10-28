import assert from "node:assert/strict";
import test from "node:test";
import { propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { ProvenancePeelback } from "./ProvenancePeelback";
import { provenancePeelbackContract as contract } from "./ProvenancePeelback.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./ProvenancePeelback.fixtures";
import { inputSchema, type Input } from "./ProvenancePeelback.schema";
function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(ProvenancePeelback, {
        frame,
        input,
        accent: "#aabbcc",
        id: "test",
      }),
    ),
  );
}
function _visibleTexts(input: Readonly<Input>): string[] {
  return [
    input.summary.label,
    input.summary.text,
    input.citationLabel,
    ...input.sources.flatMap((source) => [
      source.title,
      source.excerpt,
      ...(input.showLocators ? [source.locator] : []),
    ]),
  ];
}
registerStockPresetAssertions({
  contract,
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  render: _render,
  excludedTextFields: ["id", "selectedSourceId", "sourceArrangement"],
  getVisibleTexts: ({ input }) => _visibleTexts(input),
});
test("the focal citation names only the selected source's exact passage and optional locator", () => {
  fixtures.forEach(({ input }) => {
    const markup = _render({ frame: 150, input: input }),
      selected = input.sources.find(propEq("id", input.selectedSourceId))!;
    const citation = SvgAttributes.fromMarker({
      markup,
      marker: "focal-citation",
    });
    assert.ok(citation.includes(`data-source-id="${selected.id}"`));
    assert.ok(citation.includes(`data-excerpt="${selected.excerpt}"`));
    assert.equal(citation.includes("data-locator="), input.showLocators);
    if (input.showLocators) {
      assert.ok(citation.includes(`data-locator="${selected.locator}"`));
    }
    assert.equal((markup.match(/data-citation-underline=/g) ?? []).length, 1);
    assert.equal(
      (markup.match(/data-source-sheet=/g) ?? []).length,
      input.sources.length,
    );
    input.sources.forEach((source) =>
      assert.ok(markup.includes(`data-source-sheet="${source.id}"`)),
    );
    assert.notEqual(
      SvgAttributes.fromMarker({
        markup: _render({ frame: 36, input: input }),
        marker: "summary-strip",
      }),
      SvgAttributes.fromMarker({ markup, marker: "summary-strip" }),
    );
    assert.notEqual(
      SvgAttributes.fromMarker({
        markup: _render({ frame: 72, input: input }),
        marker: "summary-strip",
      }),
      SvgAttributes.fromMarker({ markup, marker: "summary-strip" }),
    );
    assert.match(
      SvgAttributes.fromMarker({ markup, marker: "summary-strip" }),
      /translate\(64 96\)/,
    );
    assert.match(
      SvgAttributes.fromMarker({ markup, marker: "citation-tab" }),
      /x="16"/,
    );
    assert.match(
      SvgAttributes.fromMarker({ markup, marker: "citation-link" }),
      /M464 330H480V192H512/,
    );
  });
});
test("both arrangements keep actual paragraph baselines within their upright source sheets", () => {
  ["fan", "parallel-sheets"].forEach((sourceArrangement) => {
    const input = {
      ...fixtures[2].input,
      sourceArrangement: sourceArrangement as Input["sourceArrangement"],
      summary: {
        label: "界".repeat(32),
        text: Array(7).fill("界".repeat(11)).join(" ").slice(0, 82),
      },
      sources: fixtures[2].input.sources.map((source) => ({
        ...source,
        excerpt: Array(7).fill("界".repeat(11)).join(" ").slice(0, 78),
      })),
    };
    [18, 72, 104, 150].forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      const blocks = [
        ...markup.matchAll(
          /data-copy-block="[^"]*" data-bottom="([^"]*)"[^>]*>([\s\S]*?)<\/g>/g,
        ),
      ];
      assert.equal(blocks.length, input.sources.length + 1);
      blocks.forEach(([, bottom, block]) => {
        [
          ...block.matchAll(
            /<text[^>]*y="([^"]*)"[^>]*font-size="([^"]*)"[^>]*>([\s\S]*?)<\/text>/g,
          ),
        ].forEach(([, y, fontSize, content]) => {
          const leading = [...content.matchAll(/ dy="([^"]*)"/g)].reduce(
            (sum, match) => sum + Number(match[1]),
            0,
          );
          assert.ok(
            Number(y) + leading + Number(fontSize) * 0.3 <= Number(bottom),
            `${y}+${leading} within ${bottom}`,
          );
          assert.ok(Number(y) - Number(fontSize) >= 0);
        });
      });
      assert.doesNotMatch(markup, /<g data-copy-block[^>]*rotate/);
    });
  });
});
