import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PocketInference } from "./PocketInference";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./PocketInference.fixtures";
function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: typeof DEFAULT_INPUT }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      { viewBox: "0 0 960 600" },
      createElement(PocketInference, {
        frame,
        input,
        accent: "#aabbcc",
        id: "test",
      }),
    ),
  );
}
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

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { pocketInferenceContract } from "./PocketInference.contract";
import { inputSchema } from "./PocketInference.schema";
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
    for (let frame = 0; frame < 180; frame++) {
      const markup = _render({
        frame: frame,
        input: { ...fixtures[2].input, deviceShape },
      });
      const boundary = markup.match(
        /<rect[^>]*data-device-boundary=[^>]*>/,
      )?.[0];
      assert.ok(boundary);
      const boundaryX = SvgAttributes.getNumberFromMarkup({
          attributes: boundary,
          name: "x",
        }),
        boundaryY = SvgAttributes.getNumberFromMarkup({
          attributes: boundary,
          name: "y",
        });
      Array.from([
        "model-cartridge",
        "internal-input",
        "internal-response",
      ]).forEach((marker) => {
        const rectangle = markup.match(
          new RegExp(`<rect[^>]*data-${marker}=[^>]*>`),
        )?.[0];
        assert.ok(rectangle);
        assert.ok(
          SvgAttributes.getNumberFromMarkup({
            attributes: rectangle,
            name: "x",
          }) >= boundaryX,
        );
        assert.ok(
          SvgAttributes.getNumberFromMarkup({
            attributes: rectangle,
            name: "y",
          }) >= boundaryY,
        );
        assert.ok(
          SvgAttributes.getNumberFromMarkup({
            attributes: rectangle,
            name: "x",
          }) +
            SvgAttributes.getNumberFromMarkup({
              attributes: rectangle,
              name: "width",
            }) <=
            boundaryX +
              SvgAttributes.getNumberFromMarkup({
                attributes: boundary,
                name: "width",
              }),
        );
        assert.ok(
          SvgAttributes.getNumberFromMarkup({
            attributes: rectangle,
            name: "y",
          }) +
            SvgAttributes.getNumberFromMarkup({
              attributes: rectangle,
              name: "height",
            }) <=
            boundaryY +
              SvgAttributes.getNumberFromMarkup({
                attributes: boundary,
                name: "height",
              }),
        );
      });
    }
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
      input: {
        ...fixtures[2].input,
        showCutaway,
        showLabels: false,
      },
    });
    assert.doesNotMatch(hidden, /<text/);
    assert.equal((hidden.match(/data-response-stroke=/g) ?? []).length, 3);
    assert.match(hidden, /data-model-cartridge="resident"/);
  });
});

test("the socket is visibly empty before the cartridge appears and seats before input begins", () => {
  [true, false].forEach((showCutaway) => {
    [0, 18, 20].forEach((frame) => {
      const markup = _render({
        frame: frame,
        input: { ...DEFAULT_INPUT, showCutaway },
      });
      const installation = markup.match(
        /<g([^>]*data-cartridge-installation="local"[^>]*)>(.*?)<\/g>/,
      );
      const paintingOpacity = installation
        ? SvgAttributes.getNumberFromMarkup({
            attributes: installation[1],
            name: "opacity",
          })
        : 1;
      assert.match(
        installation?.[2] ?? markup,
        /data-model-cartridge="resident"/,
      );
      assert.ok(
        (installation?.[2] ?? markup).includes(
          `aria-label="${DEFAULT_INPUT.model.label}"`,
        ),
      );
      assert.equal(
        paintingOpacity,
        0,
        `cartridge paints the setup at frame ${frame}`,
      );
      assert.match(markup, /data-model-socket=/);
    });
    const markup = _render({
      frame: 36,
      input: { ...DEFAULT_INPUT, showCutaway },
    });
    const installation = markup.match(
      /<g[^>]*data-cartridge-installation="local"[^>]*>/,
    )?.[0];
    const socket = markup.match(/<rect[^>]*data-model-socket=[^>]*>/)?.[0];
    const cartridge = markup.match(
      /<rect[^>]*data-model-cartridge=[^>]*>/,
    )?.[0];
    assert.ok(installation);
    assert.ok(socket);
    assert.ok(cartridge);
    assert.equal(
      SvgAttributes.getNumberFromMarkup({
        attributes: installation,
        name: "opacity",
      }),
      1,
    );
    ["x", "y"].forEach((axis) => {
      const extent = axis === "x" ? "width" : "height";
      assert.ok(
        SvgAttributes.getNumberFromMarkup({
          attributes: cartridge,
          name: axis,
        }) >=
          SvgAttributes.getNumberFromMarkup({ attributes: socket, name: axis }),
      );
      assert.ok(
        SvgAttributes.getNumberFromMarkup({
          attributes: cartridge,
          name: axis,
        }) +
          SvgAttributes.getNumberFromMarkup({
            attributes: cartridge,
            name: extent,
          }) <=
          SvgAttributes.getNumberFromMarkup({
            attributes: socket,
            name: axis,
          }) +
            SvgAttributes.getNumberFromMarkup({
              attributes: socket,
              name: extent,
            }),
      );
    });
  });
});
