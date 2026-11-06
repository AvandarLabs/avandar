import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { DashboardSlotAssembly } from "../DashboardSlotAssembly";
import { DEFAULT_INPUT } from "../DashboardSlotAssembly.fixtures";
import { type Input } from "../DashboardSlotAssembly.schema";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: {
  frame: number;
  input?: Input;
}): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      { viewBox: "0 0 960 600" },
      createElement(DashboardSlotAssembly, {
        frame,
        input,
        accent: "#9fefca",
        id: "test",
      }),
    ),
  );
}

function _getVisibleTextsFromInput({
  input,
}: Readonly<{ input: Input }>): string[] {
  return [
    input.boardTitle,
    ...(input.scopeLabel ? [input.scopeLabel] : []),
    ...input.widgets.flatMap((widget) => [widget.title, ...widget.lines]),
  ];
}

function _getPanelsFromMarkup(markup: string): string[] {
  return (markup.match(/<[^>]+>/g) ?? []).filter((element) =>
    element.includes("data-widget="),
  );
}

function _getPanelFromMarkup({
  markup,
  id,
}: {
  markup: string;
  id: string;
}): string {
  const element = _getPanelsFromMarkup(markup).find((item) =>
    item.includes(`data-widget="${id}"`),
  );
  assert.ok(element, id);
  return element;
}

/** Data for getRectFromPanel. */
type GetRectFromPanelResult = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function _getRectFromPanel({
  markup,
  id,
}: {
  markup: string;
  id: string;
}): GetRectFromPanelResult {
  const panel = _getPanelFromMarkup({ markup, id });
  return {
    x: SvgAttributes.getNumberFromMarkup({ attributes: panel, name: "x" }),
    y: SvgAttributes.getNumberFromMarkup({ attributes: panel, name: "y" }),
    width: SvgAttributes.getNumberFromMarkup({
      attributes: panel,
      name: "width",
    }),
    height: SvgAttributes.getNumberFromMarkup({
      attributes: panel,
      name: "height",
    }),
  };
}

function _getPanelMarkupFromId({
  markup,
  id,
}: {
  markup: string;
  id: string;
}): string {
  const start = markup.indexOf(`<g data-widget-panel="${id}"`);
  assert.ok(start >= 0);
  let depth = 0;
  const tags = markup.slice(start).matchAll(/<\/?g(?:\s[^>]*)?>/g);
  const closingTag = Array.from(tags).find((tag) => {
    depth += tag[0].startsWith("</") ? -1 : 1;
    return depth === 0;
  });
  assert.ok(closingTag, "Panel group must close.");
  return markup.slice(
    start,
    start + (closingTag.index ?? 0) + closingTag[0].length,
  );
}
export {
  _render,
  _getVisibleTextsFromInput,
  _getPanelsFromMarkup,
  _getPanelFromMarkup,
  _getRectFromPanel,
  _getPanelMarkupFromId,
};
export type { GetRectFromPanelResult };
