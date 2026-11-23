import { SpecimenAliquotBalanceTestState } from "./SpecimenAliquotBalanceTestState";

const {
  render: _render,
  attributes: _attributes,
  ASSERTIONS,
  getTextBoxes: _getTextBoxes,
} = SpecimenAliquotBalanceTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { specimenAliquotBalanceContract } from "../../SpecimenAliquotBalance.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  changedInput,
  invalidInputs,
} from "../../SpecimenAliquotBalance.fixtures";
import { inputSchema } from "../../SpecimenAliquotBalance.schema";
import { assertTransferredLiquidReducesParentParentAfter as _assertTransferredLiquidReducesParentParentAfter } from "./assertTransferredLiquidReducesParentParentAfter";

test("invalid authored inputs reject before rendering", () => {
  invalidInputs.forEach((input) => {
    return assert.equal(inputSchema.safeParse(input).success, false);
  });
});

test("transferred liquid reduces the parent and preserves every child's lineage", () => {
  const before = _render({ frame: 30, input: DEFAULT_INPUT });
  const after = _render({ frame: 150, input: DEFAULT_INPUT });
  const parentBefore = _attributes({
    markup: before,
    attribute: "data-liquid-id",
    value: DEFAULT_INPUT.parent.id,
  });
  const parentAfter = _attributes({
    markup: after,
    attribute: "data-liquid-id",
    value: DEFAULT_INPUT.parent.id,
  });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: parentBefore,
      name: "height",
    }),
    54,
  );
  _assertTransferredLiquidReducesParentParentAfter({ parentAfter, after });
  const exhausted = _render({ frame: 150, input: changedInput });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: _attributes({
        markup: exhausted,
        attribute: "data-liquid-id",
        value: changedInput.parent.id,
      }),
      name: "height",
    }),
    0,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: _attributes({
        markup: exhausted,
        attribute: "data-liquid-id",
        value: changedInput.aliquots[0].id,
      }),
      name: "height",
    }),
    108,
  );
});

registerStockPresetAssertions(ASSERTIONS);

registerStockTextLayoutAssertions(ASSERTIONS);

test("every intermediate fill conserves material at the common tube scale", () => {
  [DEFAULT_INPUT, fixtures[2].input, changedInput].forEach((input) => {
    [30, 36, 48, 60, 72, 84, 96, 108, 150].forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      const volumes = [input.parent, ...input.aliquots].map((tube) => {
        const liquid = _attributes({
          markup,
          attribute: "data-liquid-id",
          value: tube.id,
        });
        const height = SvgAttributes.getNumberFromMarkup({
          attributes: liquid,
          name: "height",
        });
        assert.ok(height >= 0);
        assert.equal(
          SvgAttributes.getNumberFromMarkup({ attributes: liquid, name: "y" }) +
            height,
          270,
        );
        assert.equal(
          SvgAttributes.getNumberFromMarkup({
            attributes: liquid,
            name: "width",
          }),
          40,
        );
        return height / 9;
      });
      assert.ok(
        Math.abs(
          volumes.reduce((total, volume) => {
            return total + volume;
          }, 0) - input.parent.volume,
        ) < 1e-10,
      );
    });
  });
  const noLineage = _render({ frame: 150, input: fixtures[4].input });
  assert.ok(!noLineage.includes("data-lineage="));
  assert.equal((noLineage.match(/data-liquid-id=/g) ?? []).length, 5);
});

test("the exact equality appears only after all authored aliquots are complete", () => {
  const before = _render({ frame: 60, input: fixtures[2].input });
  assert.ok(!before.includes('aria-label="12 ='));
  const after = _render({ frame: 150, input: fixtures[2].input });
  assert.ok(after.includes('aria-label="12 = 1 + 2 + 3 + 5 + 1"'));
});

test("dense complete tube labels and ledger text occupy separate boxes", () => {
  const boxes = _getTextBoxes(
    _render({ frame: 150, input: fixtures[2].input }),
  );
  boxes.forEach((box, index) => {
    boxes.slice(index + 1).forEach((other) => {
      assert.ok(
        box.right + 4 <= other.left ||
          other.right + 4 <= box.left ||
          box.bottom + 4 <= other.top ||
          other.bottom + 4 <= box.top,
        `Text collision: ${JSON.stringify(box)} / ${JSON.stringify(other)}`,
      );
    });
  });
});

test("serialized contract exposes tube identity validation", () => {
  // This assertion exercises the JSON serialization boundary of the public
  // contract.
  // react-doctor-disable-next-line no-json-parse-stringify-clone
  const rules = JSON.parse(
    JSON.stringify(specimenAliquotBalanceContract.semanticRules),
  ) as typeof specimenAliquotBalanceContract.semanticRules;
  const paths = ["parent.id", "aliquots.*.id"];
  const rule = rules.find((candidate) => {
    return (
      candidate.paths.length === paths.length &&
      paths.every((path) => {
        return candidate.paths.includes(path);
      })
    );
  });
  assert.ok(rule, "Runtime-only rule retains its precise field paths.");
  assert.match(rule.description, /unique.*distinct.*parent\.id/i);
});

test("serialized contract exposes volume conservation validation", () => {
  // This assertion exercises the JSON serialization boundary of the public
  // contract.
  // react-doctor-disable-next-line no-json-parse-stringify-clone
  const rules = JSON.parse(
    JSON.stringify(specimenAliquotBalanceContract.semanticRules),
  ) as typeof specimenAliquotBalanceContract.semanticRules;
  const paths = ["parent.volume", "aliquots.*.volume"];
  const rule = rules.find((candidate) => {
    return (
      candidate.paths.length === paths.length &&
      paths.every((path) => {
        return candidate.paths.includes(path);
      })
    );
  });
  assert.ok(rule, "Runtime-only rule retains its precise field paths.");
  assert.match(rule.description, /sum.*<=.*parent\.volume/i);
});
