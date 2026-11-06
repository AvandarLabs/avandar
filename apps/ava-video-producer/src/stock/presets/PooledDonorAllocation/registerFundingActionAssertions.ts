import assert from "node:assert/strict";
import test from "node:test";
import { propEq } from "@avandar/utils";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import {
  fixtures,
  unequalBatchFixtures,
} from "./PooledDonorAllocation.fixtures";
import { inputSchema, type Input } from "./PooledDonorAllocation.schema";

type Render = (options: Readonly<{ frame: number; input: Input }>) => string;
type ScoopAssertion = { render: Render; input: Input };

function _getScoopGeometry(markup: string) {
  const scoop = markup.match(/<path data-allocation-scoop[^>]*>/);
  const hand = markup.match(/<circle data-coordinator-hand[^>]*>/);
  assert.ok(scoop && hand);
  const path = scoop[0].match(/d="([^"]+)"/);
  assert.ok(path);
  return {
    points: _getPoints(path[1]),
    opacity: SvgAttributes.getNumberFromMarkup({
      attributes: scoop[0],
      name: "opacity",
    }),
    strokeRadius:
      SvgAttributes.getNumberFromMarkup({
        attributes: scoop[0],
        name: "stroke-width",
      }) / 2,
    hand: [
      SvgAttributes.getNumberFromMarkup({ attributes: hand[0], name: "cx" }),
      SvgAttributes.getNumberFromMarkup({ attributes: hand[0], name: "cy" }),
    ],
    handRadius: SvgAttributes.getNumberFromMarkup({
      attributes: hand[0],
      name: "r",
    }),
  };
}

function _assertUnequalScoopBounds({
  render,
  input,
}: Readonly<ScoopAssertion>): void {
  Array.from(
    { length: Math.max(0, Math.floor((112 - 60) / 0.25) + 1) },
    (_, sampleIndex) => 60 + sampleIndex * 0.25,
  ).forEach((frame) => {
    const markup = render({ frame: frame, input: input });
    const { points, opacity, strokeRadius, hand, handRadius } =
      _getScoopGeometry(markup);
    if (opacity > 0) {
      points.forEach(([x, y]) => {
        assert.ok(
          x - strokeRadius >= 8 && x + strokeRadius <= 952,
          `visible scoop exceeds horizontal corridor at frame ${frame}: ${x}`,
        );
        assert.ok(
          y - strokeRadius >= 125 && y + strokeRadius <= 482,
          `visible scoop exceeds vertical corridor at frame ${frame}: ${y}`,
        );
      });
      _assertScoopClearance(markup);
    }
    assert.ok(
      hand[0] - handRadius >= 8 && hand[0] + handRadius <= 952,
      `hand exceeds horizontal corridor at frame ${frame}`,
    );
    assert.ok(
      hand[1] - handRadius >= 125 && hand[1] + handRadius <= 482,
      `hand exceeds vertical corridor at frame ${frame}`,
    );
  });
}

function _assertScoopContinuity({
  render,
  input,
}: Readonly<ScoopAssertion>): void {
  [62, 63, 64, 78, 82, 83, 84, 98, 102].forEach((frame) => {
    const before = _getScoopGeometry(
      render({ frame: frame - 0.0001, input: input }),
    );
    const current = _getScoopGeometry(render({ frame: frame, input: input }));
    [...current.points, current.hand].forEach((point, index) => {
      const earlierPoint = [...before.points, before.hand][index];
      point.forEach((coordinate, axis) =>
        assert.ok(
          Math.abs(coordinate - earlierPoint[axis]) < 0.1,
          `scoop or hand jumps at frame ${frame}: ${earlierPoint[axis]} to ${coordinate}`,
        ),
      );
    });
  });
}

function _assertTippedSupport({
  markup,
  donorIndex,
}: {
  markup: string;
  donorIndex: number;
}): void {
  const tray = markup.match(
    new RegExp(`<path data-donor-tray="${donorIndex}"[^>]*d="([^"]+)"`),
  );
  const hand = markup.match(
    new RegExp(`<circle data-donor-hand="${donorIndex}"[^>]*>`),
  );
  assert.ok(tray && hand);
  const [, left, right] = _getPoints(tray[1]);
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: hand[0], name: "cx" }),
    left[0],
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: hand[0], name: "cy" }),
    left[1],
  );
  const tokens = [
    ...markup.matchAll(
      new RegExp(
        `<g data-token="${donorIndex}:[^"]*"[^>]*transform="translate\\(([^ ]+) ([^)]+)\\)"`,
        "g",
      ),
    ),
  ];
  assert.ok(tokens.length > 0);
  tokens.forEach((match) => {
    const y =
      left[1] +
      ((Number(match[1]) - left[0]) / (right[0] - left[0])) *
        (right[1] - left[1]);
    assert.ok(Math.abs(y - Number(match[2]) - 22) < 0.001);
  });
}

function _assertBatchJourney({
  render,
  input,
  requestId,
  index,
}: Readonly<Journey>): void {
  const start = 64 + index * 20;
  const ids = [
    ...render({ frame: start + 1, input: input }).matchAll(
      /<g data-token="([^"]*)"[^>]*>/g,
    ),
  ]
    .filter(([attributes]) => attributes.includes('data-owner="coordinator"'))
    .map((match) => match[1]);
  const expected = _getAllocatedCount({ input, requestId });
  assert.equal(ids.length, expected);
  let relativePositions: number[][] | undefined;
  Array.from(
    { length: Math.max(0, Math.floor((start + 14 - start) / 1) + 1) },
    (_, sampleIndex) => start + sampleIndex * 1,
  ).forEach((frame) => {
    const markup = render({ frame: frame, input: input });
    const points = _getBatchPoints({ markup, ids });
    _assertScoopContact({ markup, points });
    const currentRelative = points.map(([x, y]) => [
      x - points[0][0],
      y - points[0][1],
    ]);
    const previousPositions = relativePositions;
    if (previousPositions) {
      currentRelative.forEach((point, tokenIndex) =>
        point.forEach((coordinate, axis) =>
          assert.ok(
            Math.abs(coordinate - previousPositions[tokenIndex][axis]) < 0.001,
          ),
        ),
      );
    }
    relativePositions = currentRelative;
  });
  const released = render({ frame: start + 17, input: input });
  const points = _getBatchPoints({ markup: released, ids });
  assert.deepEqual(
    points,
    _getBatchPoints({
      markup: render({ frame: start + 14, input: input }),
      ids,
    }),
  );
  const hand = released.match(/<circle data-coordinator-hand[^>]*>/);
  assert.ok(hand);
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: hand[0], name: "cy" }) >
      Math.max(...points.map(([, y]) => y)) + 24,
  );
}

function _assertScoopClearance(markup: string): void {
  const scoop = markup.match(
    /<path data-allocation-scoop[^>]*d="([^"]+)"[^>]*opacity="([^"]+)"/,
  );
  assert.ok(scoop);
  if (Number(scoop[2]) === 0) {
    return;
  }
  _getPoints(scoop[1]).forEach(([x, y]) => {
    assert.ok(
      x >= 8 && x <= 952 && y >= 125 && y <= 482,
      `scoop leaves its clear corridor at ${x},${y}`,
    );
    if (y >= 206 && y <= 330) {
      assert.ok(x >= 240, "scoop crosses the pool sidebar");
    }
  });
}

/**
 * Protect readable tipping supports and rigid, coordinator-controlled request
 * batches.
 */
export function registerFundingActionAssertions(render: Render): void {
  unequalBatchFixtures.forEach(({ id, input }) => {
    test(`unequal ${id} scoop and hand stay wholly inside the pickup and release corridor`, () => {
      _assertUnequalScoopBounds({ render, input: inputSchema.parse(input) });
    });
    test(`unequal ${id} scoop and hand remain continuous at each handling boundary`, () => {
      _assertScoopContinuity({ render, input: inputSchema.parse(input) });
    });
  });
  test("tipped donor credits remain supported above the actual tray edge", () => {
    fixtures.forEach(({ input }) => {
      const markup = render({ frame: 30, input: input });
      input.contributions.forEach((_, donorIndex) =>
        _assertTippedSupport({ markup, donorIndex }),
      );
    });
  });
  test("the scoop picks up, carries and releases the intact request batch without crossing copy", () => {
    fixtures.forEach(({ input }) => {
      input.requests.forEach((request, index) =>
        _assertBatchJourney({ render, input, requestId: request.id, index }),
      );
      Array.from(
        { length: Math.max(0, Math.ceil((180 - 0) / 1)) },
        (_, sampleIndex) => 0 + sampleIndex * 1,
      ).forEach((frame) => {
        _assertScoopClearance(render({ frame: frame, input: input }));
      });
    });
  });
}

function _getPoints(path: string): number[][] {
  return [...path.matchAll(/[ML]([^ ]+) ([^ ML]+)/g)].map((match) => [
    Number(match[1]),
    Number(match[2]),
  ]);
}

type Journey = {
  render: Render;
  input: Input;
  requestId: string;
  index: number;
};

function _getBatchPoints({
  markup,
  ids,
}: {
  markup: string;
  ids: string[];
}): number[][] {
  const tokens = [...markup.matchAll(/<g data-token="([^"]*)"[^>]*>/g)].filter(
    (match) => ids.includes(match[1]),
  );
  assert.equal(tokens.length, ids.length);
  return tokens.map(([attributes]) => {
    const point = attributes.match(/translate\(([^ ]+) ([^)]+)\)/);
    assert.ok(point);
    return [Number(point[1]), Number(point[2])];
  });
}

function _assertScoopContact({
  markup,
  points,
}: {
  markup: string;
  points: number[][];
}): void {
  const hand = markup.match(/<circle data-coordinator-hand[^>]*>/);
  const scoop = markup.match(/<path data-allocation-scoop[^>]*d="([^"]+)"/);
  assert.ok(hand && scoop);
  const right = Math.max(...points.map(([x]) => x)) + 23;
  const bottom = Math.max(...points.map(([, y]) => y)) + 24;
  assert.ok(
    Math.abs(
      SvgAttributes.getNumberFromMarkup({ attributes: hand[0], name: "cx" }) -
        right,
    ) < 0.000001,
  );
  assert.ok(
    Math.abs(
      SvgAttributes.getNumberFromMarkup({ attributes: hand[0], name: "cy" }) -
        bottom,
    ) < 0.000001,
  );
  assert.ok(
    _getPoints(scoop[1]).some(
      ([x, y]) =>
        Math.abs(x - right) < 0.000001 && Math.abs(y - bottom) < 0.000001,
    ),
  );
}

function _getAllocatedCount({
  input,
  requestId,
}: {
  input: Input;
  requestId: string;
}): number {
  return input.allocations
    .filter(propEq("requestId", requestId))
    .reduce((sum, item) => sum + item.credits, 0);
}
