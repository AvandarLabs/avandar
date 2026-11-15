/** Physical choreography and authored-contract regression assertions. */
import assert from "node:assert/strict";
import test from "node:test";
import { propEq } from "@avandar/utils";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import {
  _render,
  _lid,
  _lossInputs,
  captionCases,
  _assertBalanceCaptions,
} from "./SavedSeedSeasonReturnTestHelpers";

test("storage lid stays closed without loss and joins smoothly before planting", () => {
  Array.from(_lossInputs()).forEach((input) => {
    Array.from([49, 56, 68, 74, 92, 100, 101, 111]).forEach((frame) => {
      assert.ok(
        Math.abs(
          _lid({ frame: frame - 0.001, input }) -
            _lid({ frame: frame + 0.001, input }),
        ) < 0.1,
        `continuous lid join at ${frame}`,
      );
    });
    assert.equal(
      _lid({ frame: 56, input }),
      286,
      "initial reservation closes before storage",
    );
    assert.equal(
      _lid({ frame: 100, input }),
      286,
      "loss opening closes before planting",
    );
    assert.equal(
      _lid({ frame: 101, input }),
      286,
      "planting starts from a closed lid",
    );
    assert.equal(
      _lid({ frame: 111, input }),
      250,
      "planting opens the same jar",
    );
    Array.from(
      { length: Math.max(0, Math.floor((111 - 56) / 0.25) + 1) },
      (_, sampleIndex) => 56 + sampleIndex * 0.25,
    ).forEach((frame) => {
      const current = _lid({ frame, input });
      assert.ok(current >= 250 && current <= 286);
      assert.ok(
        Math.abs(current - _lid({ frame: frame - 0.25, input })) < 4,
        `no abrupt closure at ${frame}`,
      );
      if (input.crop.storageLossQuantity === 0 && frame <= 101) {
        assert.equal(
          current,
          286,
          `zero-loss storage stays closed at ${frame}`,
        );
      }
    });
  });
});

test("loss lid closes only after the full material shape clears its opening", () => {
  Array.from(
    _lossInputs().filter((value) => value.crop.storageLossQuantity > 0),
  ).forEach((input) => {
    assert.equal(
      _lid({ frame: 74, input }),
      250,
      "loss opening precedes extraction",
    );
    Array.from(
      { length: Math.max(0, Math.floor((101 - 74) / 0.25) + 1) },
      (_, sampleIndex) => 74 + sampleIndex * 0.25,
    ).forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      const lid = SvgAttributes.fromMarker({ markup, marker: "jar-lid" });
      const loss = SvgAttributes.fromMarker({ markup, marker: "seed-loss" });
      const left = SvgAttributes.getNumberFromMarkup({
        attributes: loss,
        name: "x",
      });
      const top = SvgAttributes.getNumberFromMarkup({
        attributes: loss,
        name: "y",
      });
      const right =
        left +
        SvgAttributes.getNumberFromMarkup({ attributes: loss, name: "width" });
      const lidRight =
        SvgAttributes.getNumberFromMarkup({ attributes: lid, name: "x" }) +
        SvgAttributes.getNumberFromMarkup({ attributes: lid, name: "width" });
      const lidBottom =
        SvgAttributes.getNumberFromMarkup({ attributes: lid, name: "y" }) +
        SvgAttributes.getNumberFromMarkup({ attributes: lid, name: "height" });
      if (
        left < lidRight &&
        right >
          SvgAttributes.getNumberFromMarkup({ attributes: lid, name: "x" })
      ) {
        assert.ok(
          lidBottom <= top ||
            top +
              SvgAttributes.getNumberFromMarkup({
                attributes: loss,
                name: "height",
              }) <=
              SvgAttributes.getNumberFromMarkup({ attributes: lid, name: "y" }),
          `whole loss band clears the lid at ${frame}`,
        );
      }
      if (_lid({ frame, input }) > _lid({ frame: frame - 0.25, input })) {
        assert.ok(
          left > lidRight + 1.5,
          `whole loss portion clears before closure at ${frame}`,
        );
      }
    });
  });
});

test("remaining and sown captions change together only after the actual sowing transfer", () => {
  captionCases.forEach((value) =>
    [123, 124, 143, 143.999, 144, 150].forEach((frame) =>
      _assertBalanceCaptions({ value, frame }),
    ),
  );
});

test("zero loss never opens the jar during the closed storage interval", () => {
  _lossInputs()
    .filter(propEq("crop.storageLossQuantity", 0))
    .forEach((input) => {
      Array.from(
        { length: Math.max(0, Math.floor((101 - 56) / 0.25) + 1) },
        (_, sampleIndex) => 56 + sampleIndex * 0.25,
      ).forEach((frame) => {
        assert.equal(_lid({ frame, input }), 286, `zero-loss jar at ${frame}`);
      });
    });
});
