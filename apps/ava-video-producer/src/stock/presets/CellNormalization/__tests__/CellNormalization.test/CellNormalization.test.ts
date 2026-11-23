import assert from "node:assert/strict";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { cellNormalizationContract as contract } from "../../CellNormalization.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../../CellNormalization.fixtures";
import { inputSchema, type Input } from "../../CellNormalization.schema";
import { CellNormalizationTestState } from "./CellNormalizationTestState";

const {
  getOriginalHeading: _getOriginalHeading,
  getComparisonHeadingsFollowActualOriginalDenseGeometry:
    _getComparisonHeadingsFollowActualOriginalDenseGeometry,
  assertComparisonHeadingsFollowActualOriginalEditExplanation:
    _assertComparisonHeadingsFollowActualOriginalEditExplanation,
  render: _render,
  visibleTexts: _visibleTexts,
  labeledText: _labeledText,
  markedText: _markedText,
  renderRow: _renderRow,
  assertHoldOwnership: _assertHoldOwnership,
} = CellNormalizationTestState;

registerStockPresetAssertions({
  contract,
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  render: _render,
  excludedTextFields: ["id", "comparison"],
  getVisibleTexts: ({ input }) => {
    return _visibleTexts(input);
  },
});

test("only changed cells crossfade into authored replacements while row anchors stay fixed", () => {
  fixtures.forEach(({ input }) => {
    const setup = _render({ frame: 36, input: input }),
      middle = _render({ frame: 76, input: input }),
      hold = _render({ frame: 150, input: input });
    assert.equal(
      (hold.match(/data-edit-bracket=/g) ?? []).length,
      input.rows.filter((row) => {
        return row.before !== row.after;
      }).length,
    );
    const rowPositions = (markup: string) => {
      return [
        ...markup.matchAll(/data-cleanup-row="([^"]*)" transform="([^"]*)"/g),
      ].map((match) => {
        return match.slice(1);
      });
    };
    assert.deepEqual(rowPositions(setup), rowPositions(hold));
    assert.equal(rowPositions(hold).length, input.rows.length);
    input.rows.forEach((row) => {
      if (row.before !== row.after) {
        const marker = `data-replacement="${row.id}"`;
        const element = (markup: string) => {
          return markup.slice(
            markup.indexOf(marker),
            markup.indexOf(">", markup.indexOf(marker)),
          );
        };
        assert.match(element(setup), /opacity="0"/);
        assert.match(element(hold), /opacity="1"/);
        assert.doesNotMatch(element(middle), /opacity="[01]"/);
      }
    });
    assert.match(
      SvgAttributes.fromMarker({ markup: setup, marker: "original-rail" }),
      /opacity="0"/,
    );
    assert.match(
      SvgAttributes.fromMarker({ markup: hold, marker: "original-rail" }),
      /opacity="1"/,
    );
  });
});

test("data values keep actual spaces, tabs, breaks and empty strings with visual marks on or off", () => {
  const input = fixtures[4].input;
  [true, false].forEach((showWhitespace) => {
    return ["side-rail", "inline-ghost"].forEach((comparison) => {
      const held = _render({
        frame: 150,
        input: {
          ...input,
          showWhitespace,
          comparison: comparison as Input["comparison"],
        },
      });
      input.rows.forEach((row) => {
        assert.ok(held.includes(`aria-label="${row.before}"`));
        assert.ok(held.includes(`data-original-value="${row.before}"`));
      });
      assert.equal(held.includes("·"), showWhitespace);
      assert.equal(held.includes("⇥"), showWhitespace);
      assert.equal(held.includes("↵"), showWhitespace);
      assert.match(held, /xml:space="preserve"/);
    });
  });
  const composite = _render({ frame: 150, input: fixtures[3].input });
  assert.ok(composite.includes("12 (40)"));
  assert.doesNotMatch(composite, /data-edit-bracket="composite"/);
});

test("comparison headings follow actual original, result and edit lanes at setup and hold", () => {
  const { dense } = _getComparisonHeadingsFollowActualOriginalDenseGeometry();
  [DEFAULT_INPUT, dense].forEach((source) => {
    return ["side-rail", "inline-ghost"].forEach((comparison) => {
      return [true, false].forEach((showEditLabels) => {
        const input: Input = {
          ...source,
          comparison: comparison as Input["comparison"],
          showEditLabels,
        };
        const { setup, before } = _getOriginalHeading(input);
        assert.equal(
          _labeledText({ markup: setup, role: "result", placement: "primary" })
            .opacity,
          0,
        );
        assert.match(
          SvgAttributes.fromMarker({ markup: setup, marker: "cleanup-label" }),
          /opacity="1"/,
        );
        const first = _markedText({
          markup: _renderRow({ input, index: 0, frame: 36 }),
          marker: "before-cell",
        });
        assert.equal(before.x, first.x);
        assert.equal(first.copy, input.rows[0].before);
        const firstRow = _renderRow({ input, index: 0, frame: 36 });
        assert.match(
          SvgAttributes.fromMarker({
            markup: firstRow,
            marker: "original-value",
          }),
          /opacity="0"/,
        );
        _assertComparisonHeadingsFollowActualOriginalEditExplanation({
          showEditLabels,
          firstRow,
        });
        _assertHoldOwnership(input);
      });
    });
  });
});
