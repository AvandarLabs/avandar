import assert from "node:assert/strict";
import test from "node:test";
import { prop, propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SealedHandoff } from "./SealedHandoff";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./SealedHandoff.fixtures";
function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: typeof DEFAULT_INPUT }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      { viewBox: "0 0 960 600" },
      createElement(SealedHandoff, {
        frame,
        input,
        accent: "#aabbcc",
        id: "test",
      }),
    ),
  );
}
test("both reveal rules show the open setup and opaquely cover the retained brief throughout travel", () => {
  Array.from(["recipient", "remain-sealed"] as const).forEach((revealRule) => {
    const input = { ...DEFAULT_INPUT, revealRule };
    assert.match(
      _render({ frame: 18, input: input }),
      /data-cover-progress="0"/,
    );
    assert.match(
      _render({ frame: 18, input: input }),
      /Example meeting: blue shed/,
    );
    Array.from(
      { length: Math.max(0, Math.floor((108 - 72) / 1) + 1) },
      (_, sampleIndex) => 72 + sampleIndex * 1,
    ).forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      assert.match(markup, /data-opaque-cover="closed"/);
      assert.match(markup, /data-cover-progress="1"/);
      assert.match(markup, /Example meeting: blue shed/);
      assert.ok(
        markup.indexOf("data-brief-paper=") <
          markup.indexOf("data-opaque-cover="),
      );
    });
  });
});
test("the recipient opens only after arrival while remain-sealed never reopens after closure", () => {
  Array.from(
    { length: Math.max(0, Math.ceil((180 - 66) / 1)) },
    (_, sampleIndex) => 66 + sampleIndex * 1,
  ).forEach((frame) => {
    assert.match(
      _render({
        frame: frame,
        input: { ...DEFAULT_INPUT, revealRule: "remain-sealed" },
      }),
      /data-cover-progress="1"/,
    );
  });
  Array.from(
    { length: Math.max(0, Math.floor((120 - 66) / 1) + 1) },
    (_, sampleIndex) => 66 + sampleIndex * 1,
  ).forEach((frame) => {
    assert.match(_render({ frame: frame }), /data-cover-progress="1"/);
  });
  assert.match(_render({ frame: 150 }), /data-cover-progress="0"/);
  assert.match(_render({ frame: 110 }), /Received, still sealed/);
  assert.match(_render({ frame: 150 }), /Opened by recipient/);
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { sealedHandoffContract } from "./SealedHandoff.contract";
import { inputSchema } from "./SealedHandoff.schema";
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  contract: sealedHandoffContract,
  invalidInputs,
  render: _render,
  excludedTextFields: ["id", "revealRule"],
  textFrames: [18, 80, 110, 150],
  getVisibleTexts: ({ input, frame }) => [
    input.copy.example,
    input.copy[
      frame < 66
        ? "contents"
        : frame < 108
          ? "covered"
          : input.revealRule === "recipient" && frame >= 120
            ? "opened"
            : "received"
    ],
    ...(frame < 36 || (input.revealRule === "recipient" && frame >= 136)
      ? input.brief.map(prop("line"))
      : []),
    ...(frame >= 66 && (input.revealRule !== "recipient" || frame <= 120)
      ? [
          input.address.sender,
          input.address.recipient,
          ...(input.showExteriorReference ? [input.address.reference] : []),
        ]
      : []),
  ],
});
test("the actual full-opacity cover bounds enclose the still-painted brief throughout transit", () => {
  Array.from(["recipient", "remain-sealed"] as const).forEach((revealRule) => {
    for (let frame = 66; frame <= 120; frame++) {
      const markup = _render({
        frame: frame,
        input: { ...fixtures[2].input, revealRule },
      });
      const paper = markup.match(/<rect[^>]*data-brief-paper=[^>]*>/)?.[0];
      const cover = markup.match(/<rect[^>]*data-opaque-cover=[^>]*>/)?.[0];
      assert.ok(paper);
      assert.ok(cover);
      assert.equal(
        SvgAttributes.getNumberFromMarkup({
          attributes: cover,
          name: "opacity",
        }),
        1,
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({
          attributes: cover,
          name: "fill-opacity",
        }),
        1,
      );
      assert.match(cover, /fill="#142632"/);
      Array.from(["x", "y"]).forEach((axis) => {
        const extent = axis === "x" ? "width" : "height";
        assert.ok(
          SvgAttributes.getNumberFromMarkup({
            attributes: cover,
            name: axis,
          }) <=
            SvgAttributes.getNumberFromMarkup({
              attributes: paper,
              name: axis,
            }),
        );
        assert.ok(
          SvgAttributes.getNumberFromMarkup({ attributes: cover, name: axis }) +
            SvgAttributes.getNumberFromMarkup({
              attributes: cover,
              name: extent,
            }) >=
            SvgAttributes.getNumberFromMarkup({
              attributes: paper,
              name: axis,
            }) +
              SvgAttributes.getNumberFromMarkup({
                attributes: paper,
                name: extent,
              }),
        );
      });
      assert.ok(
        markup.indexOf("data-opaque-cover=") >
          markup.indexOf('data-brief-line="line-3"'),
      );
      const payload = markup.slice(
        markup.indexOf("data-brief-content="),
        markup.indexOf("data-cover-progress="),
      );
      assert.doesNotMatch(payload, /opacity=/);
    }
  });
});
test("exterior reference and text toggles preserve a covered physical handoff", () => {
  Array.from(["recipient", "remain-sealed"] as const).forEach((revealRule) => {
    for (const showExteriorReference of [true, false]) {
      const markup = _render({
        frame: 90,
        input: {
          ...DEFAULT_INPUT,
          revealRule,
          showExteriorReference,
        },
      });
      assert.equal(
        markup.includes('aria-label="Example brief A"'),
        showExteriorReference,
      );
      assert.match(markup, /aria-label="Example author"/);
      assert.match(markup, /aria-label="Example coordinator"/);
      const hidden = _render({
        frame: 90,
        input: {
          ...DEFAULT_INPUT,
          revealRule,
          showExteriorReference,
          showLabels: false,
        },
      });
      assert.doesNotMatch(hidden, /<text/);
      assert.match(hidden, /data-opaque-cover="closed"/);
    }
  });
});
test("the initial setup and recipient result unfold every flap away from the readable brief", () => {
  assert.doesNotMatch(_render({ frame: 18 }), /data-final-flap=/);
  assert.match(_render({ frame: 150 }), /d="M0 266 L268 350 L536 266 z"/);
  assert.match(
    _render({ frame: 150 }),
    /d="M0 0 L-36 133 L0 266 z M536 0 L572 133 L536 266 z"/,
  );
});

test("all exterior address lines have opaque separation from fold seams", async () => {
  const { sealedHandoffContract: correctionContract } =
    await import("./SealedHandoff.contract");
  const { SealedHandoff: Component } = await import("./SealedHandoff");
  const { ExteriorAddress } = await import("./ExteriorAddress");
  const { SvgPaintAssertions } =
    await import("../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions");
  Array.from([
    correctionContract.defaultInput,
    correctionContract.fixtures.find(propEq("id", "dense"))!.input,
  ]).forEach((source) => {
    const input = { ...source, showLabels: true, showExteriorReference: true };
    const markup = renderToStaticMarkup(
      createElement(Component, {
        input,
        frame: 150,
        accent: "#9fefca",
        id: "correction",
      }),
    );

    const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(
      renderToStaticMarkup(
        createElement(ExteriorAddress, { input, frame: 90 }),
      ),
    );
    const labels = paint.filter(propEq("kind", "text"));
    assert.ok(labels.length > 0);
    labels.forEach((label) =>
      assert.ok(
        paint.some(
          (item) =>
            item.kind === "rect" &&
            item.fill !== "none" &&
            item.opacity * item.fillOpacity === 1 &&
            item.paintIndex < label.paintIndex &&
            item.left <= label.left &&
            item.right >= label.right &&
            item.top <= label.top &&
            item.bottom >= label.bottom,
        ),
        "Address lines remain clear of physical envelope seams",
      ),
    );
  });
});
