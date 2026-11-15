import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { ResumableByteTransfer } from "./ResumableByteTransfer";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./ResumableByteTransfer.fixtures";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: typeof DEFAULT_INPUT }>): string {
  return renderToStaticMarkup(
    createElement(ResumableByteTransfer, {
      frame,
      input,
      accent: "#9fefca",
      id: "packet26",
    }),
  );
}

test("confirmed bytes survive interruption and resumption begins at their boundary", () => {
  assert.match(_render({ frame: 55 }), /data-confirmed-bytes="400"/);
  assert.match(_render({ frame: 80 }), /data-confirmed-bytes="400"/);
  assert.match(_render({ frame: 100 }), /data-resume-offset="400"/);
  assert.match(_render({ frame: 139 }), /data-confirmed-bytes="1200"/);
  const confirmed = SvgAttributes.fromMarker({
    markup: _render({ frame: 80 }),
    marker: "received-chunk",
  });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: confirmed, name: "y" }),
    380,
  );
  const moving = SvgAttributes.fromMarker({
    markup: _render({ frame: 100 }),
    marker: "moving-chunk",
  });
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: moving, name: "y" }) >
      180 &&
      SvgAttributes.getNumberFromMarkup({ attributes: moving, name: "y" }) <
        380,
  );
});
test("unequal final chunks and every accepted checkpoint partition the file exactly", () => {
  [0, 400, 800].forEach((acknowledgedBytes) => {
    const input = {
      ...DEFAULT_INPUT,
      file: { ...DEFAULT_INPUT.file, sizeBytes: 1100 },
      acknowledgedBytes,
    };
    const final = _render({ frame: 150, input: input });
    assert.match(final, /data-chunk-end="1100"/);
    assert.match(final, /data-chunk-bytes="300"/);
    Array.from({ length: 180 }, (_, frame) => frame).forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      const attributes = SvgAttributes.fromMarker({
        markup,
        marker: "byte-counters",
      });
      const confirmed = SvgAttributes.getNumberFromMarkup({
        attributes: attributes,
        name: "data-confirmed-bytes",
      });
      const remaining = SvgAttributes.getNumberFromMarkup({
        attributes,
        name: "data-remaining-bytes",
      });
      assert.equal(confirmed + remaining, 1100);
      const starts = [...markup.matchAll(/data-received-chunk="(\d+)"/g)].map(
        ([, value]) => value,
      );
      assert.equal(new Set(starts).size, starts.length);
    });
  });
});
test("still pending adds one resumed chunk and keeps a positive remainder with offsets hidden", () => {
  const hold = _render({ frame: 150, input: fixtures[3].input });
  assert.match(hold, /data-confirmed-bytes="400"/);
  assert.match(hold, /data-remaining-bytes="700"/);
  assert.doesNotMatch(hold, /data-offset-label=/);
});

import { registerStockLocalizationAssertions } from "../../../../tests/helpers/registerStockLocalizationAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { getConservativeWidthFromText } from "../../text/getConservativeWidthFromText";
import { resumableByteTransferContract } from "./ResumableByteTransfer.contract";
import { inputSchema, type Input } from "./ResumableByteTransfer.schema";

function _getVisibleTexts({ input }: Readonly<{ input: Input }>): string[] {
  return [input.file.label, ...Object.values(input.labels)];
}
const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: resumableByteTransferContract,
  render: _render,
  excludedTextFields: ["finalOutcome"],
  getVisibleTexts: _getVisibleTexts,
  textFrames: [52, 105, 150],
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(options);
registerStockTextLayoutAssertions(options);
registerStockLocalizationAssertions({
  contract: resumableByteTransferContract,
  expectedTextPaths: [
    ["file", "label"],
    ["labels", "confirmed"],
    ["labels", "retry"],
    ["labels", "remaining"],
    ["labels", "unit"],
  ],
  suppliedInputs: fixtures.map(prop("input")),
});
test("a one-byte final chunk retains positive exact geometry and is confirmed once", () => {
  const input = {
    ...DEFAULT_INPUT,
    file: { ...DEFAULT_INPUT.file, sizeBytes: 100000, chunkBytes: 99999 },
    acknowledgedBytes: 99999,
  };
  assert.deepEqual(inputSchema.parse(input), input);
  const hold = _render({ frame: 150, input: input });
  const rectangles = [
    ...hold.matchAll(/<rect[^>]*data-received-chunk="([^"]*)"[^>]*>/g),
  ].map(([tag]) => tag);
  assert.equal(rectangles.length, 2);
  const last = rectangles[1];
  assert.ok(
    Math.abs(
      SvgAttributes.getNumberFromMarkup({ attributes: last, name: "width" }) -
        0.00792,
    ) < 1e-10,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: last, name: "y" }),
    380,
  );
  assert.match(hold, /data-confirmed-bytes="100000"/);
});
test("every dense chunk boundary resumes without moving any already received prefix", () => {
  Array.from({ length: 6 }, (_, index) => index * 10).forEach(
    (acknowledgedBytes) => {
      const input = {
        ...DEFAULT_INPUT,
        file: { label: "Dense chunks", sizeBytes: 60, chunkBytes: 10 },
        acknowledgedBytes,
      };
      assert.deepEqual(inputSchema.parse(input), input);
      const pause = _render({ frame: 80, input: input }),
        hold = _render({ frame: 150, input: input });
      assert.match(
        pause,
        new RegExp(`data-confirmed-bytes="${acknowledgedBytes}"`),
      );
      assert.equal((hold.match(/data-received-chunk=/g) ?? []).length, 6);
      [80, 91, 100, 120, 139].forEach((frame) => {
        const markup = _render({ frame: frame, input: input });
        [
          ...markup.matchAll(/<rect[^>]*data-received-chunk="(\d+)"[^>]*>/g),
        ].forEach(([tag, start]) => {
          if (Number(start) < acknowledgedBytes) {
            assert.equal(
              SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "y" }),
              380,
            );
          }
        });
      });
    },
  );
});
test("the full retry caption identifies every exact checkpoint with offsets shown or hidden", () => {
  [
    { sizeBytes: 60, chunkBytes: 10 },
    { sizeBytes: 5, chunkBytes: 2 },
    { sizeBytes: 100000, chunkBytes: 99999 },
  ].forEach((file) => {
    Array.from(
      { length: Math.ceil(file.sizeBytes / file.chunkBytes) },
      (_, index) => index * file.chunkBytes,
    ).forEach((acknowledgedBytes) => {
      [false, true].forEach((showOffsets) => {
        [
          DEFAULT_INPUT.labels,
          fixtures[2].input.labels,
          { ...DEFAULT_INPUT.labels, retry: `界 ${"界".repeat(20)} 界` },
        ].forEach((labels) => {
          const input = {
            ...DEFAULT_INPUT,
            labels,
            file: { ...DEFAULT_INPUT.file, ...file },
            acknowledgedBytes,
            showOffsets,
          };
          [56, 66, 80, 100, 139, 150].forEach((frame) => {
            const markup = _render({ frame: frame, input: input });
            const caption = [...markup.matchAll(/<text[^>]+>/g)]
              .map(([tag]) => tag)
              .find((tag) =>
                tag.includes(`aria-label="${input.labels.retry}"`),
              );
            assert.ok(caption);
            const x = SvgAttributes.getNumberFromMarkup({
                attributes: caption,
                name: "x",
              }),
              fontSize = SvgAttributes.getNumberFromMarkup({
                attributes: caption,
                name: "font-size",
              });
            const right =
              x +
              getConservativeWidthFromText({
                text: input.labels.retry,
                fontSize,
              });
            const completeText = markup
              .slice(markup.indexOf(caption))
              .match(/<text[^>]*>[\s\S]*?<\/text>/)?.[0];
            assert.ok(completeText);
            SvgPaintAssertions.assertTextCanvasBounds({
              markup: `<g transform="translate(${-x} -74)">${completeText}</g>`,
              width: 360,
              height: 64,
            });
            const checkpoint = 84 + (acknowledgedBytes / file.sizeBytes) * 792;
            const link = [...markup.matchAll(/<path[^>]+>/g)]
              .map(([tag]) => tag)
              .find((tag) => tag.includes("data-retry-caption-link="));
            if (!link) {
              assert.ok(
                checkpoint >= x && checkpoint <= right,
                `retry caption has no association with byte ${acknowledgedBytes}`,
              );
              return;
            }
            const points = link.match(
              /d="M([\d.]+) ([\d.]+) H([\d.]+) V([\d.]+)"/,
            );
            assert.ok(points);
            assert.equal(Number(points[1]), x);
            assert.equal(Number(points[3]), checkpoint);
            assert.ok(
              Number(points[2]) >
                SvgAttributes.getNumberFromMarkup({
                  attributes: caption,
                  name: "y",
                }) +
                  fontSize * 0.3 +
                  3,
            );
            assert.ok(Number(points[4]) >= 145 && Number(points[4]) < 157);
          });
        });
      });
    });
  });
});

import { SvgPaintAssertions } from "../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
