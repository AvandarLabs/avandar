import assert from "node:assert/strict";
import test from "node:test";
import { propEq } from "@avandar/utils";
import { assertLossLidClosesOnlyInput as _assertLossLidClosesOnlyInput } from "./assertLossLidClosesOnlyInput";
import { assertStorageLidStaysClosedInput as _assertStorageLidStaysClosedInput } from "./assertStorageLidStaysClosedInput";
import {
  _lid,
  _lossInputs,
  captionCases,
  _assertBalanceCaptions,
} from "./SavedSeedSeasonReturnTestHelpers";

test("storage lid stays closed without loss and joins smoothly before planting", () => {
  Array.from(_lossInputs()).forEach((input) => {
    return _assertStorageLidStaysClosedInput(input);
  });
});

test("loss lid closes only after the full material shape clears its opening", () => {
  Array.from(
    _lossInputs().filter((value) => {
      return value.crop.storageLossQuantity > 0;
    }),
  ).forEach((input) => {
    return _assertLossLidClosesOnlyInput(input);
  });
});

test("remaining and sown captions change together only after the actual sowing transfer", () => {
  captionCases.forEach((value) => {
    return [123, 124, 143, 143.999, 144, 150].forEach((frame) => {
      return _assertBalanceCaptions({ value, frame });
    });
  });
});

test("zero loss never opens the jar during the closed storage interval", () => {
  _lossInputs()
    .filter(propEq("crop.storageLossQuantity", 0))
    .forEach((input) => {
      Array.from(
        { length: Math.max(0, Math.floor((101 - 56) / 0.25) + 1) },
        (_, sampleIndex) => {
          return 56 + sampleIndex * 0.25;
        },
      ).forEach((frame) => {
        assert.equal(_lid({ frame, input }), 286, `zero-loss jar at ${frame}`);
      });
    });
});
