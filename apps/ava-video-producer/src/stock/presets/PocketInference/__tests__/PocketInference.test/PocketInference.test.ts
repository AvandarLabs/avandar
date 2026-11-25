import { PocketInferenceTestState } from "./PocketInferenceTestState";

const { render: _render } = PocketInferenceTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { pocketInferenceContract } from "../../PocketInference.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../../PocketInference.fixtures";
import { inputSchema } from "../../PocketInference.schema";
import { assertActualProcessingRectangleCoordinatesDeviceShape as _assertActualProcessingRectangleCoordinatesDeviceShape } from "./assertActualProcessingRectangleCoordinatesDeviceShape";
import { assertSocketIsVisiblyEmptyShowCutaway as _assertSocketIsVisiblyEmptyShowCutaway } from "./assertSocketIsVisiblyEmptyShowCutaway";

test("the installed cartridge, input and authored response stay inside every device throughout all frames", () => {
  Array.from(["phone", "tablet", "laptop"] as const).forEach((deviceShape) => {
    for (let frame = 0; frame < 180; frame++) {
      const markup = _render({
        frame: frame,
        input: { ...fixtures[3].input, deviceShape },
      });
      assert.match(markup, /data-device-boundary=/);
      Array.from([
        "model-cartridge",
        "internal-input",
        "internal-response",
      ]).forEach((marker) => {
        const element = markup.match(
          new RegExp(`<[^>]*data-${marker}="[^"]+"[^>]*>`),
        )?.[0];
        assert.ok(element, marker);
      });
      assert.doesNotMatch(markup, /data-outbound|data-remote|data-cloud/);
    }
  });
  assert.match(
    _render({ frame: 150, input: fixtures[3].input }),
    /SELECT label FROM example_notes;/,
  );
});

test("the input precedes a single internal inference ripple and response reveal", () => {
  assert.match(_render({ frame: 20 }), /data-response-progress="0"/);
  assert.match(_render({ frame: 150 }), /data-response-progress="1"/);
  assert.match(_render({ frame: 65 }), /data-inference-ripple=/);
  assert.doesNotMatch(_render({ frame: 150 }), /data-inference-ripple=/);
});

registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  contract: pocketInferenceContract,
  invalidInputs,
  render: _render,
  excludedTextFields: ["deviceShape"],
});

test("actual processing rectangle coordinates remain within the physical casing at every frame", () => {
  Array.from(["phone", "tablet", "laptop"] as const).forEach((deviceShape) => {
    return _assertActualProcessingRectangleCoordinatesDeviceShape(deviceShape);
  });
});

test("cutaway and label toggles preserve an internal model and the actual response-line quantity", () => {
  Array.from([true, false]).forEach((showCutaway) => {
    const visible = _render({
      frame: 150,
      input: { ...fixtures[2].input, showCutaway },
    });
    assert.ok(
      visible.includes(
        `data-model-socket="${showCutaway ? "cutaway" : "screen-inset"}"`,
      ),
    );
    const hidden = _render({
      frame: 150,
      input: { ...fixtures[2].input, showCutaway, showLabels: false },
    });
    assert.doesNotMatch(hidden, /<text/);
    assert.equal((hidden.match(/data-response-stroke=/g) ?? []).length, 3);
    assert.match(hidden, /data-model-cartridge="resident"/);
  });
});

test("the socket is visibly empty before the cartridge appears and seats before input begins", () => {
  [true, false].forEach((showCutaway) => {
    return _assertSocketIsVisiblyEmptyShowCutaway(showCutaway);
  });
});
