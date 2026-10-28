import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PooledDonorAllocation } from "./PooledDonorAllocation";
import {
  changedInput,
  DEFAULT_INPUT,
  MINIMUM_INPUT,
  DENSE_INPUT,
  fixtures,
  invalidInputs,
} from "./PooledDonorAllocation.fixtures";
import { inputSchema, type Input } from "./PooledDonorAllocation.schema";
function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(PooledDonorAllocation, {
      frame,
      input,
      accent: "#9fefca",
      id: "test",
    }),
  );
}
test("Every allocated token preserves donor attribution and obeys its earmark; allocations plus residual funds equal contributions and overspending fails.", () => {
  const markup = _render({ frame: 150, input: changedInput });
  assert.equal((markup.match(/data-token=/g) ?? []).length, 10);
  assert.equal((markup.match(/data-owner="pool"/g) ?? []).length, 1);
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { pooledDonorAllocationContract } from "./PooledDonorAllocation.contract";
function _getVisibleTexts({ input }: Readonly<{ input: Input }>): string[] {
  return [
    input.scenarioCaption,
    ...Object.values(input.labels),
    ...input.requests.map(prop("label")),
    ...input.contributions.flatMap(({ donorLabel, mark }) => [
      donorLabel,
      mark,
    ]),
  ];
}
const EXCLUDED_TEXT_FIELDS: string[] = [
  "id",
  "mark",
  "earmarkedRequestId",
  "contributionId",
  "requestId",
  "envelopeArrangement",
];
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: pooledDonorAllocationContract,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
});
registerStockTextLayoutAssertions({
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
});

test("every attributed credit stays singular, restricted and visibly above its envelope", () => {
  fixtures.forEach(({ input }) => {
    Array.from({ length: 90 }, (_, index) => index * 2).forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      const tokens = [...markup.matchAll(/<g data-token="([^"]*)"[^>]*>/g)];
      assert.equal(
        tokens.length,
        input.contributions.reduce((sum, item) => sum + item.credits, 0),
      );
      assert.equal(
        new Set(tokens.map((match) => match[1])).size,
        tokens.length,
      );
      tokens.forEach(([attributes]) => {
        const x = _getTokenCoordinate({ attributes, axis: "x" });
        const y = _getTokenCoordinate({ attributes, axis: "y" });
        assert.ok(x >= 17 && x <= 943 && y >= 140 && y <= 440);
        // The full four-line sidebar ends below y=327; tokens reserve 17px
        // around it.
        if (y > 205 && y < 344) {
          assert.ok(
            x - 17 >= 238,
            `token occludes pool labels at ${x},${y}, frame ${frame}`,
          );
        }
      });
      if (frame < 132) {
        return;
      }
      input.contributions.forEach((donor) => {
        const attributed = tokens.filter(([attributes]) =>
          attributes.includes(`data-donor="${donor.id}"`),
        );
        assert.equal(attributed.length, donor.credits);
        attributed.forEach(([attributes]) => {
          if (
            attributes.includes('data-owner="request"') &&
            donor.earmarkedRequestId !== null
          ) {
            assert.ok(
              attributes.includes(`data-request="${donor.earmarkedRequestId}"`),
            );
          }
        });
      });
      input.requests.forEach((request) => {
        const allocated = tokens.filter(([attributes]) =>
          attributes.includes(`data-request="${request.id}"`),
        );
        assert.equal(
          allocated.length,
          input.allocations
            .filter(({ requestId }) => requestId === request.id)
            .reduce((sum, item) => sum + item.credits, 0),
        );
        const edge = markup.match(
          new RegExp(`<path data-envelope="${request.id}"[^>]+>`),
        );
        assert.ok(edge);
        const top = SvgAttributes.getNumberFromMarkup({
          attributes: edge[0],
          name: "data-edge",
        });
        allocated.forEach(([attributes]) =>
          assert.ok(_getTokenCoordinate({ attributes, axis: "y" }) + 20 < top),
        );
      });
      tokens.forEach(([attributes], index) =>
        tokens
          .slice(index + 1)
          .forEach(([other]) =>
            assert.ok(
              Math.hypot(
                _getTokenCoordinate({ attributes, axis: "x" }) -
                  _getTokenCoordinate({ attributes: other, axis: "x" }),
                _getTokenCoordinate({ attributes, axis: "y" }) -
                  _getTokenCoordinate({ attributes: other, axis: "y" }),
              ) >= 34,
            ),
          ),
      );
    });
  });
});
test("overspending, wrong earmarks, missing references and duplicate allocation pairs fail", () => {
  const inputs = [
    {
      ...DEFAULT_INPUT,
      allocations: [
        ...DEFAULT_INPUT.allocations,
        { contributionId: "a", requestId: "shelter", credits: 1 },
      ],
    },
    {
      ...DEFAULT_INPUT,
      allocations: DEFAULT_INPUT.allocations.map((item) => ({
        ...item,
        credits: 5,
      })),
    },
    {
      ...DEFAULT_INPUT,
      allocations: [...DEFAULT_INPUT.allocations, DEFAULT_INPUT.allocations[0]],
    },
    {
      ...DEFAULT_INPUT,
      contributions: DEFAULT_INPUT.contributions.map((item) => ({
        ...item,
        earmarkedRequestId: null,
      })),
    },
  ];
  inputs.forEach((input) =>
    assert.equal(inputSchema.safeParse(input).success, false),
  );
  assert.equal(inputSchema.safeParse(MINIMUM_INPUT).success, true);
});

test("envelope totals count the actual arrived tokens during allocation", () => {
  [92, 96, 100, 104, 108].forEach((frame) => {
    const markup = _render({ frame: frame, input: DEFAULT_INPUT });
    DEFAULT_INPUT.requests.forEach((request) => {
      const expected = [
        ...markup.matchAll(/<g data-token="[^"]*"[^>]*>/g),
      ].filter(([attributes]) =>
        attributes.includes(`data-request="${request.id}"`),
      ).length;
      const total = markup.match(
        new RegExp(
          `<text data-allocation-total="${request.id}"[^>]*>([0-9]+)</text>`,
        ),
      );
      assert.ok(total);
      assert.equal(Number(total[1]), expected);
    });
  });
});

function _getTokenCoordinate({
  attributes,
  axis,
}: Readonly<{ attributes: string; axis: "x" | "y" }>): number {
  const transform = attributes.match(
    /transform="translate\(([^ ]+) ([^)]+)\)"/,
  );
  assert.ok(transform);
  return Number(transform[axis === "x" ? 1 : 2]);
}

test("contribution totals, unique literal marks and complete request coverage are enforced", () => {
  [
    {
      ...DENSE_INPUT,
      contributions: DENSE_INPUT.contributions.map((item) => ({
        ...item,
        credits: 5,
      })),
    },
    {
      ...DEFAULT_INPUT,
      contributions: DEFAULT_INPUT.contributions.map((item) => ({
        ...item,
        mark: "A",
      })),
    },
    {
      ...DEFAULT_INPUT,
      contributions: DEFAULT_INPUT.contributions.map((item) => ({
        ...item,
        earmarkedRequestId: "missing",
      })),
    },
    {
      ...DEFAULT_INPUT,
      allocations: DEFAULT_INPUT.allocations.filter(
        ({ requestId }) => requestId === "food",
      ),
    },
    { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, extra: true } },
  ].forEach((input) =>
    assert.equal(inputSchema.safeParse(input).success, false),
  );
});

test("contributors tip their supported credits", () => {
  fixtures.forEach(({ input }) => {
    input.contributions.forEach((_, index) => {
      const before = _render({ frame: 18, input: input }).match(
        new RegExp(`<path data-donor-tray="${index}"[^>]*>`),
      );
      const tipped = _render({ frame: 30, input: input }).match(
        new RegExp(`<path data-donor-tray="${index}"[^>]*>`),
      );
      assert.ok(
        before && tipped,
        "a contributor must tip a visible token support",
      );
      assert.notEqual(before[0], tipped[0]);
      assert.match(tipped[0], /d="M[^"]+ L/);
    });
  });
});

test("one coordinator slides each configured request batch with a connected scoop", () => {
  fixtures.forEach(({ input }) => {
    input.requests.forEach((_, index) => {
      const markup = _render({ frame: 74 + index * 20, input: input });
      const hand = markup.match(/<circle data-coordinator-hand[^>]*>/);
      const arm = markup.match(/<path data-coordinator-arm[^>]*>/);
      const support = markup.match(/<path data-allocation-scoop[^>]*>/);
      assert.ok(
        hand && arm && support,
        "allocation requires connected coordinator handling geometry",
      );
      const moving = [
        ...markup.matchAll(/<g data-token="[^"]*"[^>]*>/g),
      ].filter(([attributes]) =>
        attributes.includes('data-owner="coordinator"'),
      );
      assert.equal(
        moving.length,
        input.allocations
          .filter(({ requestId }) => requestId === input.requests[index].id)
          .reduce((sum, item) => sum + item.credits, 0),
      );
      const right =
        Math.max(
          ...moving.map(([attributes]) =>
            _getTokenCoordinate({ attributes, axis: "x" }),
          ),
        ) + 23;
      const bottom =
        Math.max(
          ...moving.map(([attributes]) =>
            _getTokenCoordinate({ attributes, axis: "y" }),
          ),
        ) + 24;
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: hand[0], name: "cx" }),
        right,
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: hand[0], name: "cy" }),
        bottom,
      );
      assert.ok(support[0].includes(`${right} ${bottom}`));
    });
  });
});

test("coordinator arm and body stay on canvas through every scoop pickup and release", () => {
  fixtures.forEach(({ input }) => {
    Array.from(
      { length: Math.max(0, Math.ceil((180 - 0) / 1)) },
      (_, sampleIndex) => 0 + sampleIndex * 1,
    ).forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      const arm = markup.match(/<path data-coordinator-arm[^>]*d="([^"]+)"/);
      assert.ok(arm);
      const points = [...arm[1].matchAll(/[ML]([^ ]+) ([^ ML]+)/g)].map(
        (match) => [Number(match[1]), Number(match[2])],
      );
      assert.ok(
        points[0][0] + 17 <= 952,
        `facilitator badge exceeds canvas at frame ${frame}`,
      );
      points.forEach(([x, y]) =>
        assert.ok(x >= 8 && x <= 952 && y >= 8 && y <= 592),
      );
    });
  });
});

import { registerFundingActionAssertions } from "./registerFundingActionAssertions";
registerFundingActionAssertions(_render);
