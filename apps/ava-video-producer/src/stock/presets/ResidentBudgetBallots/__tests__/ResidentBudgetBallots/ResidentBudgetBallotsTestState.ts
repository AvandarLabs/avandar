import assert from "node:assert/strict";
import { prop } from "@avandar/utils";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { type Input } from "../../ResidentBudgetBallots.schema";
import { ResidentBallotTestHelpers } from "./ResidentBallotTestHelpers";

/** Asserts rendered geometry. */
function _assertRenderedGeometryMark({
  mark,
  screen,
  markup,
}: Readonly<{
  mark: ReturnType<typeof ResidentBallotTestHelpers.marker>;
  screen: ReturnType<typeof ResidentBallotTestHelpers.marker>;
  markup: ReturnType<typeof ResidentBallotTestHelpers.render>;
}>): void {
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
  _assertRenderedGeometryScreen({ screen, markRight, markBottom });
  assert.ok(
    markup.indexOf(mark) < markup.indexOf(screen),
    "screen must paint over the mark",
  );
}

/** Asserts rendered geometry. */
function _assertRenderedGeometryScreen({
  screen,
  markRight,
  markBottom,
}: Readonly<{
  screen: ReturnType<typeof ResidentBallotTestHelpers.marker>;
  markRight: number;
  markBottom: number;
}>): void {
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
}

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertConcentratedPapersPreserveIdentitiesPapersOptions = {
  papers: Readonly<
    Array<{
      x: number;
      y: number;
      width: number;
      height: number;
    }>
  >;
  input: Readonly<Input>;
  hold: ReturnType<typeof ResidentBallotTestHelpers.render>;
  projectId: Input["ballots"][number]["projectId"];
};

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertCastPapersRiseThroughPaperOptions = {
  paper: ReturnType<typeof ResidentBallotTestHelpers.marker>;
  openingY: number;
  before: ReturnType<typeof ResidentBallotTestHelpers.marker>;
  emerging: ReturnType<typeof ResidentBallotTestHelpers.render>;
};

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

function _assertPrivateMark({
  input,
  index,
}: {
  input: Input;
  index: number;
}): void {
  const ballot = input.ballots[index];
  const markup = ResidentBallotTestHelpers.render({
    frame: 20 + index * 2,
    input,
  });
  const mark = ResidentBallotTestHelpers.marker({
    markup,
    marker: "ballot-mark",
    id: ballot.id,
  });
  const screen = ResidentBallotTestHelpers.marker({
    markup,
    marker: "privacy-screen",
    id: ballot.id,
  });
  _assertRenderedGeometryMark({ mark, screen, markup });
}

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
      ResidentBallotTestHelpers.marker({
        markup: closed,
        marker: "paper",
        id: ballot.id,
      }),
      ResidentBallotTestHelpers.marker({
        markup: open,
        marker: "paper",
        id: ballot.id,
      }),
      "papers remain stationary until the box is open",
    );
    assert.equal(
      (
        ResidentBallotTestHelpers.render({ frame: 150, input }).match(
          new RegExp(`data-ballot="${ballot.id}"`, "g"),
        ) || []
      ).length,
      1,
    );
  });
}

function _assertBoxOpening(input: Input): void {
  const closed = ResidentBallotTestHelpers.render({ frame: 76, input }),
    opening = ResidentBallotTestHelpers.render({ frame: 80, input }),
    open = ResidentBallotTestHelpers.render({ frame: 84, input });
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
    _boxShapes(ResidentBallotTestHelpers.render({ frame: 85, input })),
    "lid must finish opening before the first extraction",
  );
  _assertStationaryPapers({ input, closed, open });
  assert.notEqual(
    ResidentBallotTestHelpers.marker({
      markup: open,
      marker: "paper",
      id: input.ballots[0].id,
    }),
    ResidentBallotTestHelpers.marker({
      markup: ResidentBallotTestHelpers.render({ frame: 113, input }),
      marker: "paper",
      id: input.ballots[0].id,
    }),
  );
  assert.ok(
    !SvgAttributes.fromMarker({
      markup: ResidentBallotTestHelpers.render({ frame: 85, input }),
      marker: "ballot-box",
    }).includes('opacity="0"'),
  );
}
/** Shared authored fixtures and renderers for this preset's assertions. */
export const ResidentBudgetBallotsTestState = {
  EXCLUDED_TEXT_FIELDS,
  visible: _visible,
  escape: _escape,
  assertPrivateMark: _assertPrivateMark,
  boxShapes: _boxShapes,
  assertBoxOpening: _assertBoxOpening,
};
