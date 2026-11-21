import { ResumableByteTransferTestState } from "./ResumableByteTransferTestState";

const { render: _render, options } = ResumableByteTransferTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { registerStockDefaultTextAssertions } from "../../../../../../tests/helpers/registerStockDefaultTextAssertions";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { resumableByteTransferContract } from "../../ResumableByteTransfer.contract";
import { DEFAULT_INPUT, fixtures } from "../../ResumableByteTransfer.fixtures";
import { inputSchema } from "../../ResumableByteTransfer.schema";
import { assertFullRetryCaptionIdentifiesFile as _assertFullRetryCaptionIdentifiesFile } from "./assertFullRetryCaptionIdentifiesFile";

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
    Array.from({ length: 180 }, (_, frame) => {
      return frame;
    }).forEach((frame) => {
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
        ([, value]) => {
          return value;
        },
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

registerStockPresetAssertions(options);

registerStockTextLayoutAssertions(options);

registerStockDefaultTextAssertions({
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
  ].map(([tag]) => {
    return tag;
  });
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
  Array.from({ length: 6 }, (_, index) => {
    return index * 10;
  }).forEach((acknowledgedBytes) => {
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
  });
});

test("the full retry caption identifies every exact checkpoint with offsets shown or hidden", () => {
  [
    { sizeBytes: 60, chunkBytes: 10 },
    { sizeBytes: 5, chunkBytes: 2 },
    { sizeBytes: 100000, chunkBytes: 99999 },
  ].forEach((file) => {
    return _assertFullRetryCaptionIdentifiesFile(file);
  });
});
