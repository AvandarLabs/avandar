import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { DuplicateReviewStack } from "../DuplicateReviewStack";
import { DEFAULT_INPUT, fixtures } from "../DuplicateReviewStack.fixtures";
import type { Input } from "../DuplicateReviewStack.schema";
/** Inputs for assertRoleCaptionClearance. */
type AssertRoleCaptionClearanceArguments = {
  caption: string;
  x: number;
  width: number;
};

/** Checks the complete role caption fits the candidate and stage bounds. */
function _assertRoleCaptionClearance({
  caption,
  x,
  width,
}: Readonly<AssertRoleCaptionClearanceArguments>): void {
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: caption, name: "x" }) +
      288 <=
      x + width,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: caption,
      name: "font-size",
    }),
    12,
  );
  const baseline = _getComparisonCaptionBaseline({ caption });
  assert.ok(baseline + 4 <= 600);
}

const render = ({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string => {
  return renderToStaticMarkup(
    createElement(DuplicateReviewStack, {
      frame,
      input,
      accent: "#72d5bd",
      id: "test",
    }),
  );
};
function _cards(markup: string): string[] {
  return [...markup.matchAll(/<rect[^>]*data-candidate-id="[^"]*"[^>]*>/g)].map(
    (match) => {
      return match[0];
    },
  );
}
function _texts({
  markup,
  label,
}: {
  markup: string;
  label: string;
}): string[] {
  return [...markup.matchAll(/<text\b[^>]*>[\s\S]*?<\/text>/g)]
    .map((match) => {
      return match[0];
    })
    .filter((text) => {
      return text.includes(`aria-label="${label}"`);
    });
}
function _assertPairRoles({
  markup,
  input,
}: {
  markup: string;
  input: Input;
}): void {
  const rects = _cards(markup);
  input.groups.forEach((group) => {
    if (group.retainedId === null) {
      return;
    }
    group.records.forEach((record) => {
      return _assertComparisonRecordRole({
        record,
        group,
        rects,
        markup,
        input,
      });
    });
  });
}
function _createPairInput({
  recordCount,
  retainedIndex,
}: {
  recordCount: number;
  retainedIndex: number;
}): Input {
  return {
    ...fixtures[2].input,
    finalView: "comparison-pair",
    labels: {
      retained: `界 ${"界".repeat(20)} ${"界".repeat(5)}`,
      alternatives: `語 ${"語".repeat(20)} ${"語".repeat(5)}`,
      unresolved: "界".repeat(28),
    },
    groups: fixtures[2].input.groups.map((group) => {
      return {
        ...group,
        records: group.records.slice(0, recordCount),
        retainedId: group.records[retainedIndex].id,
      };
    }),
  };
}
export { render, _cards, _texts, _assertPairRoles, _createPairInput };

type GetOwnedComparisonCaptionOptions = {
  markup: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
};
/** Finds the role caption within its own candidate card horizontal bounds. */
function _getOwnedComparisonCaption({
  markup,
  label,
  x,
  y,
  width,
  height,
}: Readonly<GetOwnedComparisonCaptionOptions>): string | undefined {
  return _texts({ markup, label }).find((text) => {
    const textX = SvgAttributes.getNumberFromMarkup({
        attributes: text,
        name: "x",
      }),
      textY = SvgAttributes.getNumberFromMarkup({
        attributes: text,
        name: "y",
      });
    return (
      textX >= x &&
      textX < x + width &&
      textY >= y + height + 12 &&
      textY <= y + height + 20
    );
  });
}

type GetComparisonCaptionBaselineOptions = {
  caption: string;
};
/** Accumulates the actual tspan offsets of the role caption. */
function _getComparisonCaptionBaseline({
  caption,
}: Readonly<GetComparisonCaptionBaselineOptions>): number {
  return (
    SvgAttributes.getNumberFromMarkup({ attributes: caption, name: "y" }) +
    [...caption.matchAll(/<tspan\b[^>]*>/g)].reduce((total, [span]) => {
      return (
        total +
        SvgAttributes.getNumberFromMarkup({ attributes: span, name: "dy" })
      );
    }, 0)
  );
}

type AssertComparisonRecordRoleOptions = {
  record: Input["groups"][number]["records"][number];
  group: Input["groups"][number];
  rects: readonly string[];
  markup: string;
  input: Input;
};
/**
 * Checks one retained or alternative record owns its complete visible caption.
 */
function _assertComparisonRecordRole({
  record,
  group,
  rects,
  markup,
  input,
}: Readonly<AssertComparisonRecordRoleOptions>): void {
  const card = rects.find((rect) => {
    return rect.includes(`data-candidate-id="${record.id}"`);
  });
  assert.ok(card);
  const x = SvgAttributes.getNumberFromMarkup({ attributes: card, name: "x" }),
    y = SvgAttributes.getNumberFromMarkup({ attributes: card, name: "y" });
  const width = SvgAttributes.getNumberFromMarkup({
      attributes: card,
      name: "width",
    }),
    height = SvgAttributes.getNumberFromMarkup({
      attributes: card,
      name: "height",
    });
  const label =
    record.id === group.retainedId
      ? input.labels.retained
      : input.labels.alternatives;
  const caption = _getOwnedComparisonCaption({
    markup,
    label,
    x,
    y,
    width,
    height,
  });
  assert.ok(caption, `${record.id} owns its ${label} caption below its card`);
  _assertRoleCaptionClearance({ caption, x, width });
}
