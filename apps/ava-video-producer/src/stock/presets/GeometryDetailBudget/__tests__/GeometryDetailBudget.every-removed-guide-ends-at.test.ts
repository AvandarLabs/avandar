import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { getSvgAttributeMatchesFromMarkup } from "../../../../../tests/helpers/getSvgAttributeMatchesFromMarkup/getSvgAttributeMatchesFromMarkup";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { SvgPaintAssertions } from "../../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
import { DEFAULT_INPUT, fixtures } from "../GeometryDetailBudget.fixtures";
import { inputSchema, type Input } from "../GeometryDetailBudget.schema";
import { _render } from "./GeometryDetailBudgetTestHelpers";

type GetRetainedGuideProjectionOptions = Readonly<{
  guide: string;
  kept: readonly number[];
  input: Input;
}>;

type GetRetainedGuideProjectionResult = {
  x: number;
  y: number;
  px: number;
  py: number;
};

function _getRetainedGuideProjection({
  guide,
  kept,
  input,
}: GetRetainedGuideProjectionOptions): GetRetainedGuideProjectionResult {
  const index = SvgAttributes.getNumberFromMarkup({
    attributes: guide,
    name: "data-removed-index",
  });
  const upper = kept.find((retained) => {
    return retained > index;
  })!;
  const lower = kept[kept.indexOf(upper) - 1];
  const [x, y] = input.vertices[index];
  const [ax, ay] = input.vertices[lower];
  const [bx, by] = input.vertices[upper];
  const dx = bx - ax;
  const dy = by - ay;
  const fraction =
    dx * dx + dy * dy
      ? Math.max(
          0,
          Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)),
        )
      : 0;
  const px = ax + fraction * dx;
  const py = ay + fraction * dy;
  return { x, y, px, py };
}

function _assertEveryRemovedGuideEndsAtDataSourceVertex({
  markup,
  input,
}: Readonly<{
  markup: ReturnType<typeof _render>;
  input: (typeof fixtures)[number]["input"];
}>): void {
  assert.deepEqual(
    getSvgAttributeMatchesFromMarkup({
      markup: markup,
      attribute: "data-source-vertex",
    }).tags.map((tag) => {
      return [
        SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "cx" }),
        SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "cy" }),
      ];
    }),
    input.vertices.map(([x, y]) => {
      return [60 + x * 3.6, 160 + y * 3.6];
    }),
  );
}

test("every removed guide ends at its own finite retained segment without moving any source vertex", () => {
  fixtures.forEach(({ input }) => {
    const enabled = { ...input, showDeviationGuides: true };
    const markup = _render({ frame: 150, input: enabled });
    const kept = getSvgAttributeMatchesFromMarkup({
      markup: markup,
      attribute: "data-kept-index",
    }).values.map(Number);
    getSvgAttributeMatchesFromMarkup({
      markup: markup,
      attribute: "data-removed-index",
    }).tags.forEach((guide) => {
      const { x, y, px, py } = _getRetainedGuideProjection({
        guide,
        kept,
        input,
      });
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: guide, name: "x1" }),
        60 + x * 3.6,
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: guide, name: "y1" }),
        160 + y * 3.6,
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: guide, name: "x2" }),
        60 + px * 3.6,
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: guide, name: "y2" }),
        160 + py * 3.6,
      );
      assert.ok(Math.hypot(x - px, y - py) <= input.tolerance);
    });
    _assertEveryRemovedGuideEndsAtDataSourceVertex({ markup, input });
  });
});

test("near-threshold displayed deviations preserve the exact comparison on both sides", () => {
  [16.004, 15.996, 16.000000000000004, 15.999999999999996].forEach(
    (middleY) => {
      const input = inputSchema.parse({
        ...DEFAULT_INPUT,
        vertices: [
          [10, 10],
          [50, middleY],
          [90, 10],
        ],
        tolerance: 6,
      });
      const distance = Math.abs(middleY - 10);
      const markup = _render({ frame: 150, input: input });
      const comparisons = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(
        markup,
      )
        .filter((item) => {
          return item.kind === "text" && item.top >= 390;
        })
        .map(prop("text"))
        .join(" ");
      assert.ok(comparisons.includes(String(distance)), comparisons);
      assert.equal(Number(String(distance)) > 6, distance > 6);
      assert.ok(comparisons.includes(distance > 6 ? ">" : "≤"));
    },
  );
});

test("both trace captions own explicit style samples matching the overlaid traces at every phase", () => {
  [36, 80, 150].forEach((frame) => {
    const markup = _render({ frame: frame });
    const samples = getSvgAttributeMatchesFromMarkup({
      markup: markup,
      attribute: "data-trace-sample",
    }).tags;
    assert.equal(samples.length, 2);
    assert.ok(samples[0].includes('stroke="#728794"'));
    assert.ok(samples[1].includes('stroke="#3caeff"'));
    const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(markup);
    [DEFAULT_INPUT.labels.original, DEFAULT_INPUT.labels.simplified].forEach(
      (label, index) => {
        const caption = paint.find((item) => {
          return item.kind === "text" && item.ariaLabel === label;
        })!;
        const x = SvgAttributes.getNumberFromMarkup({
          attributes: samples[index],
          name: "data-sample-right",
        });
        assert.ok(caption.left > x);
        assert.ok(caption.left - x <= 24);
        assert.ok(
          Math.abs(
            caption.top -
              SvgAttributes.getNumberFromMarkup({
                attributes: samples[index],
                name: "data-sample-top",
              }),
          ) <= 16,
        );
      },
    );
  });
});

test("full precision deviations and tolerance preserve all dense event text without paint collisions", () => {
  const input = { ...fixtures[2].input, tolerance: 0.0000010000000000000002 };
  [36, 80, 150].forEach((frame) => {
    const markup = _render({ frame: frame, input: input });
    const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(markup);
    SvgPaintAssertions.assertPaintClearance({
      texts: paint.filter((item) => {
        return item.kind === "text" && item.ariaLabel !== undefined;
      }),
      rectangles: [],
    });
    assert.ok(
      paint.some((item) => {
        return item.ariaLabel?.includes(String(input.tolerance));
      }),
    );
  });
});
