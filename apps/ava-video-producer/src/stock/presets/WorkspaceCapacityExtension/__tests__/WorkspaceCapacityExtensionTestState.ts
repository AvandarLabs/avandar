import assert from "node:assert/strict";
import { propEq, prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { getTextEnvelopesFromMarkup } from "../../SchemaColumnEvolution/getTextEnvelopesFromMarkup";
import { WorkspaceCapacityExtension } from "../WorkspaceCapacityExtension";
import { DEFAULT_INPUT } from "../WorkspaceCapacityExtension.fixtures";
import { type Input } from "../WorkspaceCapacityExtension.schema";

/** Asserts rendered geometry. */
function _assertRenderedGeometryFirstRequest({
  firstRequest,
  caption,
  requestX,
  tabs,
  markup,
}: Readonly<AssertRenderedGeometryFirstRequestOptions>): void {
  const requestY = SvgAttributes.getNumberFromMarkup({
    attributes: firstRequest,
    name: "y",
  });
  assert.ok(
    caption.top >= 400,
    "pending caption belongs below the retained tray",
  );
  assert.ok(
    caption.right <= requestX - 16,
    "pending caption sits beside requests",
  );
  tabs.forEach((tab) => {
    const x = SvgAttributes.getNumberFromMarkup({ attributes: tab, name: "x" });
    const y = SvgAttributes.getNumberFromMarkup({ attributes: tab, name: "y" });
    assert.ok(
      caption.right <= x ||
        caption.x >= x + 78 ||
        caption.bottom <= y ||
        caption.top >= y + 132,
      "caption clears every resource throughout seating",
    );
  });
  const connector = markup.match(/<path [^>]*data-pending-link[^>]*>/)![0];
  assert.match(connector, /stroke="#[a-fA-F0-9]+"/);
  assert.ok(connector.includes(`V${requestY + 66} H${requestX}`));
}

/** Inputs consumed by the corresponding rendered assertions. */

type AssertRenderedGeometryFirstRequestOptions = {
  firstRequest: NonNullable<Array<RegExpExecArray[number]>>[number];
  caption: ReturnType<typeof getTextEnvelopesFromMarkup>[number];
  requestX: number;
  tabs: Readonly<Array<RegExpExecArray[number]>>;
  markup: string;
};

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: typeof DEFAULT_INPUT }>): string {
  return renderToStaticMarkup(
    createElement(WorkspaceCapacityExtension, {
      frame,
      input,
      accent: "#9fefca",
      id: "test",
    }),
  );
}

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  const isExpanded = input.choice.decision === "expand" && frame >= 125;
  return [
    input.copy.workspace,
    input.copy.capacity,
    input.copy.retained,
    input.copy.example,
    ...(frame >= 51 ? [input.choice.label] : []),
    ...(!isExpanded ? [input.copy.pending] : []),
    ...(input.showResourceLabels
      ? [...input.existingResources, ...input.requestedResources].map(
          prop("label"),
        )
      : []),
  ];
}

const EXCLUDED_TEXT_FIELDS: string[] = ["id", "decision"];

function _assertPendingCaptionClearance({
  input,
  frame,
}: {
  input: Input;
  frame: number;
}): void {
  const markup = _render({ frame: frame, input: input });
  const caption = getTextEnvelopesFromMarkup(markup).find(
    propEq("label", input.copy.pending),
  )!;
  const tabs = [...markup.matchAll(/<rect data-resource-tab[^>]*>/g)].map(
    (match) => {
      return match[0];
    },
  );
  const firstRequest = tabs[input.existingResources.length];
  const requestX = SvgAttributes.getNumberFromMarkup({
    attributes: firstRequest,
    name: "x",
  });
  _assertRenderedGeometryFirstRequest({
    firstRequest,
    caption,
    requestX,
    tabs,
    markup,
  });
}
/** Shared authored fixtures and renderers for this preset's assertions. */
export const WorkspaceCapacityExtensionTestState = {
  render: _render,
  getVisibleTexts: _getVisibleTexts,
  EXCLUDED_TEXT_FIELDS,
  assertPendingCaptionClearance: _assertPendingCaptionClearance,
};
