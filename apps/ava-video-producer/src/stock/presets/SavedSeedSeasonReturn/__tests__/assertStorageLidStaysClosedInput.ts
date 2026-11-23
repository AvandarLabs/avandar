import assert from "node:assert/strict";
import { _lid, _lossInputs } from "./SavedSeedSeasonReturnTestHelpers";

/**
 * Asserts storage lid stays closed without loss and joins smoothly before
 * planting.
 */
export function assertStorageLidStaysClosedInput(
  input: ReturnType<typeof _lossInputs>[number],
): void {
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
  assert.equal(_lid({ frame: 111, input }), 250, "planting opens the same jar");
  Array.from(
    { length: Math.max(0, Math.floor((111 - 56) / 0.25) + 1) },
    (_, sampleIndex) => {
      return 56 + sampleIndex * 0.25;
    },
  ).forEach((frame) => {
    const current = _lid({ frame, input });
    assert.ok(current >= 250 && current <= 286);
    assert.ok(
      Math.abs(current - _lid({ frame: frame - 0.25, input })) < 4,
      `no abrupt closure at ${frame}`,
    );
    if (input.crop.storageLossQuantity === 0 && frame <= 101) {
      assert.equal(current, 286, `zero-loss storage stays closed at ${frame}`);
    }
  });
}
