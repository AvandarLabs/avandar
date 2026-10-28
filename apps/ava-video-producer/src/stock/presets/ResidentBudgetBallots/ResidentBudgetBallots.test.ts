/** Behavioral scene, input, identity and geometry assertions. */
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ResidentBudgetBallots } from "./ResidentBudgetBallots";
import {
  DEFAULT_INPUT,
  INVALID_INPUTS,
  fixtures,
} from "./ResidentBudgetBallots.fixtures";
import { inputSchema, type Input } from "./ResidentBudgetBallots.schema";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(ResidentBudgetBallots, {
      frame,
      input,
      accent: "#67e8c2",
      id: "test",
    }),
  );
}

test("all four ballot identities become two bench one books and one abstention", () => {
  const setup = _render({ frame: 20 });
  const hold = _render({ frame: 150 });
  DEFAULT_INPUT.ballots.forEach((ballot) => {
    assert.match(setup, new RegExp(`data-ballot="${ballot.id}"`));
    assert.match(hold, new RegExp(`data-ballot="${ballot.id}"`));
  });
  assert.match(hold, /data-tally="bench"[^>]*data-total="2"/);
  assert.match(hold, /data-tally="books"[^>]*data-total="1"/);
  assert.match(hold, /data-abstentions="1"/);
  assert.doesNotMatch(hold, /data-winner|data-funding/);
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { residentBudgetBallotsContract as contract } from "./ResidentBudgetBallots.contract";

const EXCLUDED_TEXT_FIELDS: string[] = [
  "id",
  "permissionId",
  "projectId",
  "role",
  "kind",
  "before",
  "after",
  "participantResponse",
  "partition",
  "symbol",
  "tallyArrangement",
];
function _visible({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    ...Object.values(input.labels),
    input.closingNote,
    ...input.projects.map(prop("label")),
  ];
}
function _escape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  contract,
  invalidInputs: INVALID_INPUTS,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: ({ input, frame }) =>
    _visible({ input: input, frame: frame }).map(_escape),
});
registerStockTextLayoutAssertions({
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _visible,
});

test("concentrated papers preserve all identities and disjoint final envelopes", () => {
  (["stacks", "rows"] as const).forEach((tallyArrangement) =>
    [null, "bench"].forEach((projectId) => {
      const input = {
        ...fixtures[2].input,
        tallyArrangement,
        ballots: Array.from({ length: 8 }, (_, index) => ({
          id: `${"界".repeat(14)}${index}`,
          projectId,
        })),
      };
      const hold = _render({ frame: 150, input: input });
      const papers = [...hold.matchAll(/<rect data-paper="[^"]*"[^>]*>/g)].map(
        ([attributes]) => ({
          x: SvgAttributes.getNumberFromMarkup({
            attributes: attributes,
            name: "x",
          }),
          y: SvgAttributes.getNumberFromMarkup({ attributes, name: "y" }),
          width: SvgAttributes.getNumberFromMarkup({
            attributes,
            name: "width",
          }),
          height: SvgAttributes.getNumberFromMarkup({
            attributes,
            name: "height",
          }),
        }),
      );
      assert.equal(papers.length, 8);
      papers.forEach((paper, index) => {
        assert.ok(paper.x >= 48 && paper.x + paper.width <= 912);
        assert.ok(paper.y >= 294 && paper.y + paper.height < 553);
        papers
          .slice(index + 1)
          .forEach((other) =>
            assert.ok(
              paper.x + paper.width <= other.x ||
                other.x + other.width <= paper.x ||
                paper.y + paper.height <= other.y ||
                other.y + other.height <= paper.y,
            ),
          );
      });
      input.ballots.forEach((ballot) =>
        assert.ok(hold.includes(`aria-label="${ballot.id}"`)),
      );
      const totals = [...hold.matchAll(/data-total="(\d+)"/g)].reduce(
        (sum, match) => sum + Number(match[1]),
        0,
      );
      assert.equal(totals + (projectId === null ? 8 : 0), 8);
    }),
  );
});
test("a valid empty project ID remains a cast ballot rather than an abstention", () => {
  const hold = _render({ frame: 150, input: fixtures[1].input });
  assert.match(hold, /data-ballot="" data-choice="cast"/);
  assert.match(hold, /data-tally="" data-total="1"/);
  assert.match(hold, /data-abstentions="1"/);
});
test("residents touch their moving papers before the shared box opens", () => {
  [24, 40, 47, 54].forEach((frame) => {
    const markup = _render({ frame: frame });
    const paper = SvgAttributes.fromMarker({ markup, marker: "paper" });
    const x = SvgAttributes.getNumberFromMarkup({
        attributes: paper,
        name: "x",
      }),
      y = SvgAttributes.getNumberFromMarkup({ attributes: paper, name: "y" });
    assert.ok(
      SvgAttributes.fromMarker({ markup, marker: "ballot-hand" }).includes(
        `L${x + 14} ${y + 16}`,
      ),
    );
  });
});

function _marker({
  markup,
  marker,
  id,
}: {
  markup: string;
  marker: string;
  id: string;
}): string {
  const attributes = markup.match(
    new RegExp(`<[^>]*data-${marker}="${id}"[^>]*>`),
  )?.[0];
  assert.ok(attributes, `${marker} for ${id} must be emitted`);
  return attributes;
}
function _assertPrivateMark({
  input,
  index,
}: {
  input: Input;
  index: number;
}): void {
  const ballot = input.ballots[index];
  const markup = _render({ frame: 20 + index * 2, input: input });
  const mark = _marker({ markup, marker: "ballot-mark", id: ballot.id });
  const screen = _marker({ markup, marker: "privacy-screen", id: ballot.id });
  const path = mark.match(
    /d="M([\d.]+) ([\d.]+) l([\d.]+) ([\d.]+) l([\d.]+) (-?[\d.]+)"/,
  );
  assert.ok(path);
  const [, x, y, stepX, stepY, endX, endY] = path.map(Number);
  const markRight = x + stepX + endX + 0.5;
  const markTop = Math.min(y, y + stepY, y + stepY + endY) - 0.5;
  const markBottom = Math.max(y, y + stepY, y + stepY + endY) + 0.5;
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: mark, name: "opacity" }) >
      0,
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: screen, name: "x" }) <=
      x - 0.5,
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: screen, name: "y" }) <=
      markTop,
    "opaque screen must cover the mark's top edge",
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: screen, name: "x" }) +
      SvgAttributes.getNumberFromMarkup({
        attributes: screen,
        name: "width",
      }) >=
      markRight,
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: screen, name: "y" }) +
      SvgAttributes.getNumberFromMarkup({
        attributes: screen,
        name: "height",
      }) >=
      markBottom,
  );
  assert.ok(
    !screen.includes('fill="none"') && !screen.includes('fill="transparent"'),
  );
  assert.ok(
    !screen.includes("opacity=") ||
      SvgAttributes.getNumberFromMarkup({
        attributes: screen,
        name: "opacity",
      }) === 1,
  );
  assert.ok(
    markup.indexOf(mark) < markup.indexOf(screen),
    "screen must paint over the mark",
  );
}
test("opaque privacy screens shield the actual mark bounds during marking", () => {
  [DEFAULT_INPUT, fixtures[2].input, fixtures[3].input].forEach((input) =>
    input.ballots.forEach((_, index) => _assertPrivateMark({ input, index })),
  );
});
function _boxShapes(markup: string): string[] {
  const box = markup.split('data-ballot-box="shared"')[1].split("</g>")[0];
  return box.match(/<(?:rect|path|polygon)[^>]*>/g) || [];
}
function _assertStationaryPapers({
  input,
  closed,
  open,
}: {
  input: Input;
  closed: string;
  open: string;
}): void {
  input.ballots.forEach((ballot) => {
    assert.equal(
      _marker({ markup: closed, marker: "paper", id: ballot.id }),
      _marker({ markup: open, marker: "paper", id: ballot.id }),
      "papers remain stationary until the box is open",
    );
    assert.equal(
      (
        _render({ frame: 150, input: input }).match(
          new RegExp(`data-ballot="${ballot.id}"`, "g"),
        ) || []
      ).length,
      1,
    );
  });
}
function _assertBoxOpening(input: Input): void {
  const closed = _render({ frame: 76, input: input }),
    opening = _render({ frame: 80, input: input }),
    open = _render({ frame: 84, input: input });
  assert.notDeepEqual(
    _boxShapes(closed),
    _boxShapes(opening),
    "box geometry must open before extraction instead of only fading",
  );
  assert.notDeepEqual(
    _boxShapes(opening),
    _boxShapes(open),
    "opening geometry must move through its interval",
  );
  assert.deepEqual(
    _boxShapes(open),
    _boxShapes(_render({ frame: 85, input: input })),
    "lid must finish opening before the first extraction",
  );
  _assertStationaryPapers({ input, closed, open });
  assert.notEqual(
    _marker({ markup: open, marker: "paper", id: input.ballots[0].id }),
    _marker({
      markup: _render({ frame: 113, input: input }),
      marker: "paper",
      id: input.ballots[0].id,
    }),
  );
  assert.ok(
    !SvgAttributes.fromMarker({
      markup: _render({ frame: 85, input: input }),
      marker: "ballot-box",
    }).includes('opacity="0"'),
  );
}
test("the shared box changes opening geometry before the same papers extract", () => {
  [DEFAULT_INPUT, fixtures[2].input, fixtures[3].input].forEach(
    _assertBoxOpening,
  );
});

test("cast papers rise through the open top before traveling toward tally columns", () => {
  [DEFAULT_INPUT, fixtures[2].input].forEach((input) => {
    input.ballots.forEach((ballot, index) => {
      if (ballot.projectId === null) {
        return;
      }
      const waiting = _render({ frame: 84, input: input });
      const emerging = _render({ frame: 92 + index * 2, input: input });
      const before = _marker({
        markup: waiting,
        marker: "paper",
        id: ballot.id,
      });
      const paper = _marker({
        markup: emerging,
        marker: "paper",
        id: ballot.id,
      });
      const body = _boxShapes(emerging)[0];
      const openingY = SvgAttributes.getNumberFromMarkup({
        attributes: body,
        name: "y",
      });
      assert.ok(
        SvgAttributes.getNumberFromMarkup({ attributes: before, name: "y" }) >=
          openingY,
      );
      assert.ok(
        SvgAttributes.getNumberFromMarkup({ attributes: paper, name: "y" }) +
          SvgAttributes.getNumberFromMarkup({
            attributes: paper,
            name: "height",
          }) <=
          openingY,
        "each folded paper must clear the open top before lateral tally travel",
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: paper, name: "x" }),
        SvgAttributes.getNumberFromMarkup({ attributes: before, name: "x" }),
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: paper, name: "width" }),
        SvgAttributes.getNumberFromMarkup({
          attributes: before,
          name: "width",
        }),
      );
      assert.ok(
        emerging.indexOf("data-paper=") <
          emerging.indexOf('data-ballot-box="shared"'),
        "box front must occlude the part of a paper still inside during extraction",
      );
    });
  });
});
