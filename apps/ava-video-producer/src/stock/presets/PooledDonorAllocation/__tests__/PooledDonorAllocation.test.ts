import assert from "node:assert/strict";
import test from "node:test";
import { propEq } from "@avandar/utils";
import { registerStockPresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { pooledDonorAllocationContract } from "../PooledDonorAllocation.contract";
import {
  changedInput,
  DEFAULT_INPUT,
  MINIMUM_INPUT,
  DENSE_INPUT,
  fixtures,
  invalidInputs,
} from "../PooledDonorAllocation.fixtures";
import { inputSchema } from "../PooledDonorAllocation.schema";
import { assertEveryAttributedCreditStaysInput as _assertEveryAttributedCreditStaysInput } from "./assertEveryAttributedCreditStaysInput";
import { assertOneCoordinatorSlidesConfiguredInput as _assertOneCoordinatorSlidesConfiguredInput } from "./assertOneCoordinatorSlidesConfiguredInput";
import { PooledDonorAllocationTestState } from "./PooledDonorAllocationTestState";
import { registerFundingActionAssertions } from "./registerFundingActionAssertions";

const {
  render: _render,
  getVisibleTexts: _getVisibleTexts,
  EXCLUDED_TEXT_FIELDS,
} = PooledDonorAllocationTestState;

test("changed allocation hold frame has ten tokens with one remaining in the pool", () => {
  const markup = _render({ frame: 150, input: changedInput });
  assert.equal((markup.match(/data-token=/g) ?? []).length, 10);
  assert.equal((markup.match(/data-owner="pool"/g) ?? []).length, 1);
});

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
    return _assertEveryAttributedCreditStaysInput(input);
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
      allocations: DEFAULT_INPUT.allocations.map((item) => {
        return { ...item, credits: 5 };
      }),
    },
    {
      ...DEFAULT_INPUT,
      allocations: [...DEFAULT_INPUT.allocations, DEFAULT_INPUT.allocations[0]],
    },
    {
      ...DEFAULT_INPUT,
      contributions: DEFAULT_INPUT.contributions.map((item) => {
        return { ...item, earmarkedRequestId: null };
      }),
    },
  ];
  inputs.forEach((input) => {
    return assert.equal(inputSchema.safeParse(input).success, false);
  });
  assert.equal(inputSchema.safeParse(MINIMUM_INPUT).success, true);
});

test("envelope totals count the actual arrived tokens during allocation", () => {
  [92, 96, 100, 104, 108].forEach((frame) => {
    const markup = _render({ frame: frame, input: DEFAULT_INPUT });
    DEFAULT_INPUT.requests.forEach((request) => {
      const expected = [
        ...markup.matchAll(/<g data-token="[^"]*"[^>]*>/g),
      ].filter(([attributes]) => {
        return attributes.includes(`data-request="${request.id}"`);
      }).length;
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

test("contribution totals, unique literal marks and complete request coverage are enforced", () => {
  [
    {
      ...DENSE_INPUT,
      contributions: DENSE_INPUT.contributions.map((item) => {
        return { ...item, credits: 5 };
      }),
    },
    {
      ...DEFAULT_INPUT,
      contributions: DEFAULT_INPUT.contributions.map((item) => {
        return { ...item, mark: "A" };
      }),
    },
    {
      ...DEFAULT_INPUT,
      contributions: DEFAULT_INPUT.contributions.map((item) => {
        return { ...item, earmarkedRequestId: "missing" };
      }),
    },
    {
      ...DEFAULT_INPUT,
      allocations: DEFAULT_INPUT.allocations.filter(
        propEq("requestId", "food"),
      ),
    },
    { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, extra: true } },
  ].forEach((input) => {
    return assert.equal(inputSchema.safeParse(input).success, false);
  });
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
    return _assertOneCoordinatorSlidesConfiguredInput(input);
  });
});

test("coordinator arm and body stay on canvas through every scoop pickup and release", () => {
  fixtures.forEach(({ input }) => {
    Array.from(
      { length: Math.max(0, Math.ceil((180 - 0) / 1)) },
      (_, sampleIndex) => {
        return 0 + sampleIndex * 1;
      },
    ).forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      const arm = markup.match(/<path data-coordinator-arm[^>]*d="([^"]+)"/);
      assert.ok(arm);
      const points = [...arm[1].matchAll(/[ML]([^ ]+) ([^ ML]+)/g)].map(
        (match) => {
          return [Number(match[1]), Number(match[2])];
        },
      );
      assert.ok(
        points[0][0] + 17 <= 952,
        `facilitator badge exceeds canvas at frame ${frame}`,
      );
      points.forEach(([x, y]) => {
        return assert.ok(x >= 8 && x <= 952 && y >= 8 && y <= 592);
      });
    });
  });
});

registerFundingActionAssertions(_render);
