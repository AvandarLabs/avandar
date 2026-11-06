/** Physical choreography and authored-contract regression assertions. */
import assert from "node:assert/strict";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { savedSeedSeasonReturnContract as contract } from ".././SavedSeedSeasonReturn.contract";
import {
  defaultInput,
  fixtures,
  invalidInputs,
} from ".././SavedSeedSeasonReturn.fixtures";
import { inputSchema } from ".././SavedSeedSeasonReturn.schema";
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
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: hold,
        marker: "seed-loss",
      }),
      name: "width",
    }),
    15,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: hold,
        marker: "seed-sown",
      }),
      name: "width",
    }),
    30,
  );
  assert.match(hold, /aria-label="1 kg"/);
  assert.doesNotMatch(hold, /sprout|germinat|yield-quantity/);
});

registerStockPresetAssertions({
  inputSchema,
  defaultInput,
  fixtures,
  invalidInputs,
  contract,
  render: _render,
  excludedTextFields,
  getVisibleTexts: ({ input, frame }) =>
    _visible({ input: input, frame: frame }).map(_escape),
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
  const cases = [
    {
      harvestQuantity: 8.03,
      reservedQuantity: 0,
      storageLossQuantity: 0,
      sownQuantity: 0,
      current: 8.03,
      remaining: 0,
    },
    {
      harvestQuantity: 8.03,
      reservedQuantity: 8.03,
      storageLossQuantity: 8.03,
      sownQuantity: 0,
      current: 0,
      remaining: 0,
    },
    {
      harvestQuantity: 8.03,
      reservedQuantity: 8.03,
      storageLossQuantity: 0.01,
      sownQuantity: 8.02,
      current: 0,
      remaining: 0,
    },
    {
      harvestQuantity: 8.03,
      reservedQuantity: 7.02,
      storageLossQuantity: 1.01,
      sownQuantity: 0.01,
      current: 1.01,
      remaining: 6,
    },
    {
      harvestQuantity: 8.03,
      reservedQuantity: 3.01,
      storageLossQuantity: 0.01,
      sownQuantity: 0,
      current: 5.02,
      remaining: 3,
    },
  ];
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
        [120, 130, 140].forEach((frame) =>
          assert.doesNotMatch(
            _render({ frame: frame, input: input }),
            /data-seed-hand="sowing"|data-furrow=/,
          ),
        );
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
    Array.from({ length: 270 }, (_, index) => 12 + index / 2).forEach(
      (frame) => {
        const markup = _render({ frame: frame, input: input });
        const bands = [
          ...markup.matchAll(
            /<rect data-seed-(?:current|remaining|loss|sown)=""[^>]*>/g,
          ),
        ].map(([r]) => ({
          x: SvgAttributes.getNumberFromMarkup({ attributes: r, name: "x" }),
          y: SvgAttributes.getNumberFromMarkup({ attributes: r, name: "y" }),
          w: SvgAttributes.getNumberFromMarkup({
            attributes: r,
            name: "width",
          }),
          h: SvgAttributes.getNumberFromMarkup({
            attributes: r,
            name: "height",
          }),
        }));
        assert.ok(
          Math.abs(bands.reduce((sum, band) => sum + band.w, 0) - 180) < 1e-9,
        );
        bands
          .filter((band) => band.w > 0)
          .forEach((a, index, nonempty) => {
            assert.ok(
              a.x >= 48 && a.x + a.w <= 928 && a.y >= 250 && a.y + a.h <= 410,
            );
            nonempty
              .slice(index + 1)
              .forEach((b) =>
                assert.ok(
                  a.x + a.w <= b.x + 1e-9 ||
                    b.x + b.w <= a.x + 1e-9 ||
                    a.y + a.h <= b.y + 1e-9 ||
                    b.y + b.h <= a.y + 1e-9,
                ),
              );
          });
        const lid = SvgAttributes.fromMarker({ markup, marker: "jar-lid" });
        bands.forEach((band) => {
          if (
            band.y < 290 &&
            band.x < 478 &&
            band.x + band.w > 278 &&
            band.w > 0
          ) {
            assert.ok(
              SvgAttributes.getNumberFromMarkup({
                attributes: lid,
                name: "y",
              }) +
                5 <=
                band.y,
            );
          }
        });
      },
    );
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
    [18, 24, 36, 48, 80, 87, 95, 125, 132, 140].forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      const hand = SvgAttributes.fromMarker({ markup, marker: "seed-hand" });
      const destination =
        frame < 49 ? "remaining" : frame < 101 ? "loss" : "sown";
      const band = SvgAttributes.fromMarker({
        markup,
        marker: `seed-${destination}`,
      });
      const widths =
        frame < 49
          ? ["remaining", "sown", "loss"].map((id) =>
              SvgAttributes.getNumberFromMarkup({
                attributes: SvgAttributes.fromMarker({
                  markup: markup,
                  marker: `seed-${id}`,
                }),
                name: "width",
              }),
            )
          : [
              SvgAttributes.getNumberFromMarkup({
                attributes: band,
                name: "width",
              }),
            ];
      assert.ok(
        Math.abs(
          SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "x2" }) -
            (SvgAttributes.getNumberFromMarkup({
              attributes: band,
              name: "x",
            }) +
              widths.reduce((sum, width) => sum + width, 0) / 2),
        ) < 1e-9,
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "y2" }),
        SvgAttributes.getNumberFromMarkup({ attributes: band, name: "y" }),
      );
      assert.ok(
        SvgAttributes.getNumberFromMarkup({
          attributes: SvgAttributes.fromMarker({ markup, marker: "jar-lid" }),
          name: "y",
        }) < 265,
      );
    });
  });
});
