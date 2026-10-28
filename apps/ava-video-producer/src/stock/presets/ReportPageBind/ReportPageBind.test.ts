import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { ReportPageBind } from "./ReportPageBind";
import { reportPageBindContract as contract } from "./ReportPageBind.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./ReportPageBind.fixtures";
import { inputSchema, type Input } from "./ReportPageBind.schema";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(ReportPageBind, {
        frame,
        input,
        accent: "#aabbcc",
        id: "test",
      }),
    ),
  );
}
registerStockPresetAssertions({
  contract,
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  render: _render,
  excludedTextFields: ["id", "finalView"],
});
test("every section retains its order and page identity in both final arrangements", () => {
  fixtures.forEach(({ input }) => {
    ["stack", "spread"].forEach((finalView) => {
      const chosen = { ...input, finalView: finalView as Input["finalView"] };
      const setup = _render({ frame: 36, input: chosen }),
        middle = _render({ frame: 78, input: chosen }),
        hold = _render({ frame: 150, input: chosen });
      assert.deepEqual(
        [...hold.matchAll(/data-page="([^"]*)"/g)].map((match) => match[1]),
        input.sections.map(prop("id")),
      );
      assert.equal(
        (hold.match(/data-page-paper=/g) ?? []).length,
        input.sections.length,
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({
          attributes: SvgAttributes.fromMarker({
            markup: setup,
            marker: "page-paper",
          }),
          name: "width",
        }),
        740,
      );
      assert.ok(
        SvgAttributes.getNumberFromMarkup({
          attributes: SvgAttributes.fromMarker({
            markup: middle,
            marker: "page-paper",
          }),
          name: "width",
        }) > 740,
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({
          attributes: SvgAttributes.fromMarker({
            markup: hold,
            marker: "page-paper",
          }),
          name: "width",
        }),
        800,
      );
      assert.ok(hold.includes(`aria-label="${input.destinationLabel}"`));
      assert.equal(
        (hold.match(/data-page-number=/g) ?? []).length,
        input.showPageNumbers ? input.sections.length : 0,
      );
    });
    assert.notEqual(
      SvgAttributes.fromMarker({
        markup: _render({
          frame: 150,
          input: { ...input, finalView: "stack" },
        }),
        marker: "page",
      }),
      SvgAttributes.fromMarker({
        markup: _render({
          frame: 150,
          input: { ...input, finalView: "spread" },
        }),
        marker: "page",
      }),
    );
  });
});

test("the title strip joins the first page's actual paper boundary", () => {
  ["stack", "spread"].forEach((finalView) => {
    const input = {
      ...DEFAULT_INPUT,
      finalView: finalView as Input["finalView"],
    };
    [78, 120, 150].forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      const page = SvgAttributes.fromMarker({ markup, marker: "page" }).match(
        /translate\(([^ ]*) ([^)]*)\)/,
      )!;
      const header = SvgAttributes.fromMarker({
        markup: markup,
        marker: "header-paper",
      });
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: header, name: "x" }) +
          16,
        Number(page[1]),
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: header, name: "y" }) +
          SvgAttributes.getNumberFromMarkup({
            attributes: header,
            name: "height",
          }),
        Number(page[2]) - 8,
      );
    });
  });
});
