/** Emitted geometry protects the authored accounting and identity semantics. */
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { getConservativeWidthFromText } from "../../../text/getConservativeWidthFromText";
import { AquiferAllocationBalance } from ".././AquiferAllocationBalance";
import { aquiferAllocationBalanceContract as contract } from ".././AquiferAllocationBalance.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from ".././AquiferAllocationBalance.fixtures";
import { inputSchema } from ".././AquiferAllocationBalance.schema";
import type { PresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import type { Input } from ".././AquiferAllocationBalance.schema";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      null,
      createElement(AquiferAllocationBalance, {
        frame,
        accent: "#74e0bd",
        id: "test",
        input,
      }),
    ),
  );
}

function _getVisibleTexts({ input }: Readonly<{ input: Input }>): string[] {
  return [
    ...Object.values(input.boundary),
    ...Object.values(input.decision),
    ...Object.entries(input.copy)
      .filter(([key]) => key !== "unallocated" || input.showUnallocatedRequest)
      .map(([, value]) => value),
  ];
}

const assertions = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render: _render,
  excludedTextFields: [
    "id",
    "cellId",
    "fromPatchId",
    "toPatchId",
    "learnerId",
    "state",
    "orientation",
    "context",
    "stage",
    "deskLayout",
  ],
  getVisibleTexts: _getVisibleTexts,
} satisfies PresetAssertions<Input>;

type Bounds = { left: number; right: number; top: number; bottom: number };

function _assertSeparate({
  first,
  second,
}: {
  first: Bounds;
  second: Bounds;
}): void {
  assert.ok(
    first.right <= second.left + 1e-9 ||
      second.right <= first.left + 1e-9 ||
      first.bottom <= second.top + 1e-9 ||
      second.bottom <= first.top + 1e-9,
    `Overlapping ownership envelopes: ${JSON.stringify({ first, second })}`,
  );
}

function _getCircleBounds(circle: string): Bounds {
  const radius =
    SvgAttributes.getNumberFromMarkup({ attributes: circle, name: "r" }) +
    SvgAttributes.getNumberFromMarkup({
      attributes: circle,
      name: "stroke-width",
    }) /
      2;
  const x = SvgAttributes.getNumberFromMarkup({
      attributes: circle,
      name: "cx",
    }),
    y = SvgAttributes.getNumberFromMarkup({ attributes: circle, name: "cy" });
  return {
    left: x - radius,
    right: x + radius,
    top: y - radius,
    bottom: y + radius,
  };
}

function _getTextBounds(markup: string): Bounds[] {
  return Array.from(markup.matchAll(/<text([^>]*)>(.*?)<\/text>/g)).flatMap(
    ([, attributes, contents]) => {
      const fontSize = SvgAttributes.getNumberFromMarkup({
        attributes,
        name: "font-size",
      });
      let baseline = SvgAttributes.getNumberFromMarkup({
        attributes,
        name: "y",
      });
      return Array.from(contents.matchAll(/<tspan([^>]*)>(.*?)<\/tspan>/g)).map(
        ([, span, text]) => {
          baseline += SvgAttributes.getNumberFromMarkup({
            attributes: span,
            name: "dy",
          });
          const width = getConservativeWidthFromText({ text, fontSize });
          const left =
            SvgAttributes.getNumberFromMarkup({ attributes: span, name: "x" }) -
            (attributes.includes('text-anchor="middle"') ? width / 2 : 0);
          return {
            left,
            right: left + width,
            top: baseline - fontSize,
            bottom: baseline + fontSize * 0.3,
          };
        },
      );
    },
  );
}

function _getOwnershipGroup({
  markup,
  marker,
  owner,
}: {
  markup: string;
  marker: string;
  owner: string;
}): string {
  const group = markup.match(
    new RegExp(`<g data-${marker}="${owner}">(.*?)</g>`),
  );
  assert.ok(group, `Visible ${marker} is missing for ${owner}`);
  return group[1];
}
/** Inputs for assertOwner. */
type AssertOwnerOptions = {
  markup: string;
  owner: string;
  number: number;
  label: string;
  quantity: number;
};

function _assertOwner({
  markup,
  owner,
  number,
  label,
  quantity,
}: Readonly<AssertOwnerOptions>): void {
  const local = _getOwnershipGroup({ markup, marker: "flow-ownership", owner });
  const budget = _getOwnershipGroup({ markup, marker: "budget-term", owner });
  const labels = Array.from(
    budget.matchAll(/<text aria-label="([^"]*)"/g),
    ([, text]) => text,
  );
  assert.deepEqual(labels, [String(number), label, String(quantity)]);
  assert.match(local, new RegExp(`<tspan[^>]*>${number}</tspan>`));
  [local, budget].forEach((group) => {
    const circle = SvgAttributes.fromMarker({
      markup: group,
      marker: "ownership-key",
    });
    assert.notEqual(circle.match(/fill="([^"]*)"/)?.[1], "none");
    const badge = _getCircleBounds(circle),
      texts = _getTextBounds(group);
    assert.ok(texts[0].left > badge.left && texts[0].right < badge.right);
    assert.ok(texts[0].top > badge.top && texts[0].bottom < badge.bottom);
    texts
      .slice(1)
      .forEach((bounds) => _assertSeparate({ first: badge, second: bounds }));
  });
}

function _assertRouteOwnership({
  markup,
  owner,
}: {
  markup: string;
  owner: string;
}): void {
  const route = markup.match(
    new RegExp(`<path[^>]*data-flow="${owner}"[^>]*>`),
  );
  assert.ok(route, owner);
  const coordinates = route[0].match(
    /d="M ([\d.]+) ([\d.]+)(?: V ([\d.]+))? H ([\d.]+)"/,
  );
  assert.ok(coordinates, "Expected an orthogonal boundary flow");
  const [, startX, startY, endY, endX] = coordinates;
  const width =
    SvgAttributes.getNumberFromMarkup({
      attributes: route[0],
      name: "stroke-width",
    }) / 2;
  const bounds = {
    left: Number(startX) - width,
    right: Number(endX) + width,
    top: Math.min(Number(startY), Number(endY ?? startY)) - width,
    bottom: Math.max(Number(startY), Number(endY ?? startY)) + width,
  };
  const local = _getOwnershipGroup({ markup, marker: "flow-ownership", owner });
  const circle = SvgAttributes.fromMarker({
    markup: local,
    marker: "ownership-key",
  });
  const endpointX = owner === "recharge" ? Number(startX) : Number(endX);
  const endpointY =
    owner === "recharge" ? Number(startY) : Number(endY ?? startY);
  assert.ok(
    Math.hypot(
      SvgAttributes.getNumberFromMarkup({ attributes: circle, name: "cx" }) -
        endpointX,
      SvgAttributes.getNumberFromMarkup({ attributes: circle, name: "cy" }) -
        endpointY,
    ) <= 20,
  );
  _assertSeparate({ first: _getCircleBounds(circle), second: bounds });
  _getTextBounds(markup).forEach((text) =>
    _assertSeparate({ first: text, second: bounds }),
  );
  const guide = markup.match(
    new RegExp(`<path[^>]*data-flow-guide="${owner}"[^>]*>`),
  );
  assert.ok(guide, "A zero flow retains its keyed physical route");
  assert.equal(
    guide[0].match(/ d="([^"]+)"/)?.[1],
    route[0].match(/ d="([^"]+)"/)?.[1],
  );
  assert.doesNotMatch(guide[0], /opacity="0"/);
}

function _assertOwnershipClearance(markup: string): void {
  const texts = _getTextBounds(markup);
  texts.forEach((text, index) =>
    texts
      .slice(index + 1)
      .forEach((other) => _assertSeparate({ first: text, second: other })),
  );
  const badges = Array.from(
    markup.matchAll(/<circle[^>]*data-ownership-key[^>]*>/g),
    ([circle]) => _getCircleBounds(circle),
  );
  const rectangles = Array.from(
    markup.matchAll(/<rect[^>]*>/g),
    ([rectangle]) => {
      const stroke = rectangle.includes('stroke="') ? 0.5 : 0;
      const left = SvgAttributes.getNumberFromMarkup({
          attributes: rectangle,
          name: "x",
        }),
        top = SvgAttributes.getNumberFromMarkup({
          attributes: rectangle,
          name: "y",
        });
      return {
        left: left - stroke,
        top: top - stroke,
        right:
          left +
          SvgAttributes.getNumberFromMarkup({
            attributes: rectangle,
            name: "width",
          }) +
          stroke,
        bottom:
          top +
          SvgAttributes.getNumberFromMarkup({
            attributes: rectangle,
            name: "height",
          }) +
          stroke,
      };
    },
  );
  badges.forEach((badge, index) => {
    badges
      .slice(index + 1)
      .forEach((other) => _assertSeparate({ first: badge, second: other }));
    rectangles.forEach((rectangle) =>
      _assertSeparate({ first: badge, second: rectangle }),
    );
    texts
      .filter(
        (text) =>
          !(
            text.left > badge.left &&
            text.right < badge.right &&
            text.top > badge.top &&
            text.bottom < badge.bottom
          ),
      )
      .forEach((text) => _assertSeparate({ first: badge, second: text }));
  });
}
export {
  _render,
  _getVisibleTexts,
  assertions,
  _assertSeparate,
  _getCircleBounds,
  _getTextBounds,
  _getOwnershipGroup,
  _assertOwner,
  _assertRouteOwnership,
  _assertOwnershipClearance,
};
export type { Bounds };
