/**
 * Behavioral, contract, and text-layout coverage for
 * term-limited-revenue-share.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { TermLimitedRevenueShare } from "./TermLimitedRevenueShare";
import { termLimitedRevenueShareContract } from "./TermLimitedRevenueShare.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./TermLimitedRevenueShare.fixtures";
import { inputSchema, type Input } from "./TermLimitedRevenueShare.schema";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(TermLimitedRevenueShare, {
      frame,
      input,
      accent: "#65d6ad",
      id: "packet22",
    }),
  );
}
const options = {
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: ["id", "arrangementLayout"],
  getVisibleTexts: ({ input }: Readonly<{ input: Input }>) => [
    ...input.periods.map(prop("label")),
    input.arrangement.label,
    input.arrangement.termBoundaryLabel,
    input.money.unitLabel,
    ...Object.values(input.copy),
  ],
} satisfies Pick<
  PresetAssertions<Input>,
  | "inputSchema"
  | "fixtures"
  | "render"
  | "excludedTextFields"
  | "getVisibleTexts"
>;
registerStockPresetAssertions({
  ...options,
  defaultInput: DEFAULT_INPUT,
  invalidInputs,
  contract: termLimitedRevenueShareContract,
});
registerStockTextLayoutAssertions({
  ...options,
  getVisibleTexts: ({
    input,
    frame,
  }: Readonly<{ input: Input; frame: number }>) =>
    frame >= 141 ? options.getVisibleTexts({ input: input }) : [],
});

test("independent periods reconcile exactly and preserve one scale in both layouts", () => {
  [DEFAULT_INPUT, fixtures[1].input, fixtures[2].input].forEach((input) => {
    ["side-by-side", "stacked"].forEach((layout) => {
      const markup = _render({
        frame: 150,
        input: {
          ...input,
          arrangementLayout: layout as Input["arrangementLayout"],
        },
      });
      const distribution =
        (input.periods[0].receiptsMinor * input.arrangement.rateBasisPoints) /
        10000;
      const retained =
        input.periods[0].receiptsMinor -
        input.periods[0].operatingOutflowMinor -
        distribution;
      assert.match(
        markup,
        new RegExp(
          `data-period="${input.periods[0].id}" data-distribution="${distribution}" data-retained="${retained}"`,
        ),
      );
      assert.match(
        markup,
        new RegExp(
          `data-period="${input.periods[1].id}" data-distribution="0" data-retained="${retained + distribution}"`,
        ),
      );
      const rectangles = Array.from(
        markup.matchAll(/data-portion="([^"]+)"[^>]*width="([^"]+)"/g),
      );
      assert.equal(rectangles.length, 6);
      [0, 3].forEach((offset) =>
        assert.ok(
          Math.abs(
            rectangles
              .slice(offset, offset + 3)
              .reduce((sum, match) => sum + Number(match[2]), 0) - 340,
          ) < 1e-9,
        ),
      );
    });
  });
});
test("the first strip partitions before the term turns and the second arrives", () => {
  assert.match(
    _render({ frame: 65 }),
    /data-period="period-b"[^>]*data-reveal="0"/,
  );
  assert.match(
    _render({ frame: 95 }),
    /data-outlet="distribution"[^>]*data-closed="true"/,
  );
  const before = SvgAttributes.fromMarker({
    markup: _render({ frame: 66 }),
    marker: "term-turn",
  });
  const during = SvgAttributes.fromMarker({
    markup: _render({ frame: 80 }),
    marker: "term-turn",
  });
  assert.notEqual(before, during);
  assert.doesNotMatch(
    _render({ frame: 150, input: fixtures[3].input }),
    /data-amount=/,
  );
});

test("one basis point remains an exact minor unit with no prior remainder carried", () => {
  const input = {
    ...DEFAULT_INPUT,
    arrangement: { ...DEFAULT_INPUT.arrangement, rateBasisPoints: 1 },
  };
  assert.equal(inputSchema.safeParse(input).success, true);
  assert.match(
    _render({ frame: 150, input: input }),
    /data-period="period-a" data-distribution="1" data-retained="3999"/,
  );
  assert.match(
    _render({ frame: 150, input: input }),
    /data-period="period-b" data-distribution="0" data-retained="4000"/,
  );
  assert.ok(_render({ frame: 150, input: input }).includes(">0.01</text>"));
});

import { setupI18n } from "@lingui/core";
import { makeLocalizedStockDataFromContract } from "../../i18n/makeLocalizedStockDataFromContract";
import { StockCopyMessages } from "../../i18n/StockCopyMessages";

test("nested authored default prose is extracted and translated without rewriting inputs", () => {
  const messageId =
    "motionAtlas.term-limited-revenue-share.default.arrangement.termBoundaryLabel";
  const messages = StockCopyMessages.getMessagesFromContract({
    [termLimitedRevenueShareContract.id]: termLimitedRevenueShareContract,
  });
  assert.equal(
    messages[messageId],
    DEFAULT_INPUT.arrangement.termBoundaryLabel,
  );
  const i18n = setupI18n({
    locale: "es",
    messages: { es: { [messageId]: "Texto traducido" } },
    missing: (_locale, id) => id,
  });
  const resolved = makeLocalizedStockDataFromContract({
    contract: termLimitedRevenueShareContract,
    i18n,
  });
  assert.equal(
    resolved.defaultInput.arrangement.termBoundaryLabel,
    "Texto traducido",
  );
  assert.notEqual(
    DEFAULT_INPUT.arrangement.termBoundaryLabel,
    "Texto traducido",
  );
  assert.ok(
    _render({ frame: 150 }).includes(
      `aria-label="${DEFAULT_INPUT.arrangement.termBoundaryLabel}"`,
    ),
  );
});

test("maximum labels and extreme arithmetic render in both arrangements", () => {
  ["side-by-side", "stacked"].forEach((arrangementLayout) => {
    [true, false].forEach((showAmounts) => {
      const input = {
        ...fixtures[2].input,
        arrangementLayout: arrangementLayout as Input["arrangementLayout"],
        showAmounts,
      };
      [0, 65, 80, 95, 118, 150].forEach((frame) =>
        assert.doesNotThrow(() => _render({ frame: frame, input: input })),
      );
    });
  });
});
