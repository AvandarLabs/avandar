import assert from "node:assert/strict";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { savedSeedSeasonReturnContract as contract } from "../SavedSeedSeasonReturn.contract";
import {
  defaultInput,
  fixtures,
  invalidInputs,
} from "../SavedSeedSeasonReturn.fixtures";
import { inputSchema } from "../SavedSeedSeasonReturn.schema";
import { assertCultivatorHandsTouchActualInput as _assertCultivatorHandsTouchActualInput } from "./assertCultivatorHandsTouchActualInput";
import { assertOpaqueMaterialBandsRemainInput as _assertOpaqueMaterialBandsRemainInput } from "./assertOpaqueMaterialBandsRemainInput";
import { assertSameReservedSeedBecomesHold as _assertSameReservedSeedBecomesHold } from "./assertSameReservedSeedBecomesHold";
import { makeZeroReserveLossSowingCasesFromAuthoredValues as _makeZeroReserveLossSowingCasesFromAuthoredValues } from "./makeZeroReserveLossSowingCasesFromAuthoredValues";
import {
  _render,
  _visible,
  _escape,
  excludedTextFields,
} from "./SavedSeedSeasonReturnTestHelpers";

test("the same reserved seed becomes exact loss, sowing and unsown remainder", () => {
  const setup = _render({ frame: 11 });
  const hold = _render({ frame: 150 });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: setup,
        marker: "seed-current",
      }),
      name: "width",
    }),
    180,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: hold,
        marker: "seed-current",
      }),
      name: "width",
    }),
    120,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: hold,
        marker: "seed-remaining",
      }),
      name: "width",
    }),
    15,
  );
  _assertSameReservedSeedBecomesHold(hold);
});

registerStockPresetAssertions({
  inputSchema,
  defaultInput,
  fixtures,
  invalidInputs,
  contract,
  render: _render,
  excludedTextFields,
  getVisibleTexts: ({ input, frame }) => {
    return _visible({ input: input, frame: frame }).map(_escape);
  },
  textFrames: [24, 72, 150],
});

registerStockTextLayoutAssertions({
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields,
  getVisibleTexts: _visible,
});

test("zero reserve loss and sowing edges conserve exact decimal material without invented use", () => {
  const cases = _makeZeroReserveLossSowingCasesFromAuthoredValues();
  cases.forEach(({ current, remaining, ...crop }) => {
    const input = { ...defaultInput, crop: { ...defaultInput.crop, ...crop } };
    assert.deepEqual(inputSchema.parse(input), input);
    [true, false].forEach((showQuantities) => {
      const markup = _render({
        frame: 150,
        input: { ...input, showQuantities },
      });
      const expected = [
        current,
        remaining,
        crop.storageLossQuantity,
        crop.sownQuantity,
      ];
      ["current", "remaining", "loss", "sown"].forEach((destination, index) => {
        const width = SvgAttributes.getNumberFromMarkup({
          attributes: SvgAttributes.fromMarker({
            markup,
            marker: `seed-${destination}`,
          }),
          name: "width",
        });
        assert.ok(Math.abs(width - (expected[index] / 8.03) * 180) < 1e-10);
      });
      if (crop.sownQuantity === 0) {
        [120, 130, 140].forEach((frame) => {
          return assert.doesNotMatch(
            _render({ frame: frame, input: input }),
            /data-seed-hand="sowing"|data-furrow=/,
          );
        });
      }
    });
    assert.ok(
      _render({ frame: 150, input: input }).includes(
        `aria-label="${remaining} kg"`,
      ),
    );
  });
});

test("opaque material bands remain disjoint and visible across fractional transfers", () => {
  fixtures.forEach(({ input }) => {
    return _assertOpaqueMaterialBandsRemainInput(input);
  });
});

test("cultivator draws the actual furrow before sowing and crop symbols remain distinct", () => {
  const markup = _render({ frame: 114 });
  const furrow = SvgAttributes.fromMarker({ markup, marker: "furrow" });
  const hand = SvgAttributes.fromMarker({ markup, marker: "seed-hand" });
  assert.match(hand, /data-seed-hand="furrow"/);
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "x2" }),
    SvgAttributes.getNumberFromMarkup({ attributes: furrow, name: "x2" }),
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "y2" }),
    SvgAttributes.getNumberFromMarkup({ attributes: furrow, name: "y2" }),
  );
  assert.match(_render({ frame: 20 }), /data-crop-symbol="bean"/);
  assert.match(
    _render({
      frame: 20,
      input: {
        ...defaultInput,
        crop: { ...defaultInput.crop, symbol: "grain" },
      },
    }),
    /data-crop-symbol="grain"/,
  );
});

test("cultivator hands touch the actual transferred lot after the jar opening", () => {
  [defaultInput, fixtures[2].input, fixtures[3].input].forEach((input) => {
    return _assertCultivatorHandsTouchActualInput(input);
  });
});
