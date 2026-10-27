/** Physical choreography and authored-contract regression assertions. */
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { registerStockPresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { sharedWorkshopBookingContract as contract } from "../SharedWorkshopBooking.contract";
import {
  defaultInput,
  fixtures,
  invalidInputs,
} from "../SharedWorkshopBooking.fixtures";
import { inputSchema } from "../SharedWorkshopBooking.schema";
import {
  _render,
  _visible,
  _escape,
  EXCLUDED_TEXT_FIELDS,
  _assertAgreementClearance,
} from "./SharedWorkshopBookingTestHelpers";

test("overlapping requests become distinct slots around exactly one machine", () => {
  const setup = _render({ frame: 20 });
  const hold = _render({ frame: 150 });
  const before = [...setup.matchAll(/<rect data-request="([^"]*)"[^>]*>/g)].map(
    ([v]) => SvgAttributes.getNumberFromMarkup({ attributes: v, name: "x" }),
  );
  const after = [...hold.matchAll(/<rect data-request="[^"]*"[^>]*>/g)].map(
    ([v]) => SvgAttributes.getNumberFromMarkup({ attributes: v, name: "x" }),
  );
  assert.deepEqual(before, [390, 390]);
  assert.deepEqual(after, [390, 570]);
  assert.equal([...hold.matchAll(/data-machine="/g)].length, 1);
  assert.match(_render({ frame: 116 }), /data-use-person="a"/);
  assert.match(_render({ frame: 138 }), /data-use-person="b"/);
});

registerStockPresetAssertions({
  inputSchema,
  defaultInput,
  fixtures,
  invalidInputs,
  contract,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: ({ input, frame }) =>
    _visible({ input: input, frame: frame }).map(_escape),
  textFrames: [24, 72, 150],
});

registerStockTextLayoutAssertions({
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _visible,
});

test("all-null choices never use the machine while empty booked IDs remain real bookings", () => {
  const unresolved = {
    ...defaultInput,
    requests: defaultInput.requests.map((request) => ({
      ...request,
      agreedSlotId: null,
    })),
  };
  inputSchema.parse(unresolved);
  [true, false].forEach((showOriginalRequests) =>
    [true, false].forEach((showUsageTurns) => {
      [20, 90, 116, 138, 150, 166].forEach((frame) => {
        const markup = _render({
          frame: frame,
          input: {
            ...unresolved,
            showOriginalRequests,
            showUsageTurns,
          },
        });
        assert.doesNotMatch(markup, /data-use-person=|data-agreement=/);
        assert.equal([...markup.matchAll(/data-participant="/g)].length, 2);
        assert.equal([...markup.matchAll(/data-machine="/g)].length, 1);
        [...markup.matchAll(/<rect data-request="[^"]*"[^>]*>/g)].forEach(
          ([rect]) =>
            assert.ok(
              SvgAttributes.getNumberFromMarkup({
                attributes: rect,
                name: "y",
              }) < 400,
            ),
        );
      });
    }),
  );
  const input = fixtures[1].input;
  assert.match(_render({ frame: 120, input: input }), /data-use-person=""/);
  assert.doesNotMatch(
    _render({ frame: 120, input: { ...input, showUsageTurns: false } }),
    /data-use-person=/,
  );
});

test("booked turns follow slot order rather than request order and ghosts add no users", () => {
  const input = fixtures[2].input;
  [true, false].forEach((showOriginalRequests) => {
    [110, 127, 142].forEach((frame, index) => {
      const markup = _render({
        frame: frame + 5,
        input: { ...input, showOriginalRequests },
      });
      const uses = [...markup.matchAll(/data-use-person="([^"]*)"/g)].map(
        (match) => match[1],
      );
      assert.deepEqual(uses, [String(2 - index)]);
    });
  });
  const hold = _render({ frame: 150, input: input });
  const rects = [...hold.matchAll(/<rect data-request="[^"]*"[^>]*>/g)].map(
    ([rect]) => ({
      x: SvgAttributes.getNumberFromMarkup({ attributes: rect, name: "x" }),
      width: SvgAttributes.getNumberFromMarkup({
        attributes: rect,
        name: "width",
      }),
    }),
  );
  rects.forEach((first, index) =>
    rects
      .slice(index + 1)
      .forEach((second) =>
        assert.ok(
          first.x + first.width < second.x || second.x + second.width < first.x,
        ),
      ),
  );
});

test("participants keep their hands on request strips throughout the agreement movement", () => {
  [defaultInput, fixtures[2].input].forEach((input) => {
    [36, 49.5, 66, 75, 85.5, 100].forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      const rects = [...markup.matchAll(/<rect data-request="([^"]*)"[^>]*>/g)];
      const hands = [
        ...markup.matchAll(/<line data-request-hand="([^"]*)"[^>]*>/g),
      ];
      assert.deepEqual(
        rects.map(([, id]) => id),
        input.requests.map(prop("id")),
      );
      assert.deepEqual(
        hands.map(([, id]) => id),
        input.requests.map(prop("id")),
      );
      rects.forEach(([rect, id]) => {
        const hand = hands.find(([, handId]) => handId === id)![0];
        assert.equal(
          SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "x2" }),
          SvgAttributes.getNumberFromMarkup({ attributes: rect, name: "x" }) +
            SvgAttributes.getNumberFromMarkup({
              attributes: rect,
              name: "width",
            }) /
              2,
        );
        assert.equal(
          SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "y2" }),
          SvgAttributes.getNumberFromMarkup({ attributes: rect, name: "y" }),
        );
      });
    });
  });
});

test("machine kind selects vertical sewing or horizontal bench work at the same asset", () => {
  (["sewing-machine", "workbench"] as const).forEach((kind) => {
    const input = {
      ...defaultInput,
      machine: { ...defaultInput.machine, kind },
    };
    const use = SvgAttributes.fromMarker({
      markup: _render({ frame: 117, input: input }),
      marker: "use-person",
    });
    if (kind === "sewing-machine") {
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: use, name: "cx" }),
        240,
      );
      assert.ok(
        SvgAttributes.getNumberFromMarkup({ attributes: use, name: "cy" }) <
          405,
      );
    } else {
      assert.ok(
        SvgAttributes.getNumberFromMarkup({ attributes: use, name: "cx" }) >
          240,
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: use, name: "cy" }),
        405,
      );
    }
  });
});

test("agreed caption clears actual default strips at frame 90", () => {
  _assertAgreementClearance({ input: defaultInput, frame: 90 });
});

test("agreed caption clears actual dense actors at frame 150", () => {
  _assertAgreementClearance({
    input: {
      ...fixtures[2].input,
      labels: { ...fixtures[2].input.labels, agreed: "語".repeat(30) },
    },
    frame: 150,
  });
});

test("wrapped agreement caption stays clear of names, heads, hands and returning people", () => {
  Array.from(["sewing-machine", "workbench"] as const).forEach((kind) => {
    Array.from(fixtures).forEach(({ input }) => {
      const candidate = {
        ...input,
        machine: { ...input.machine, kind },
        labels: { ...input.labels, agreed: "語".repeat(30) },
      };
      inputSchema.parse(candidate);
      [
        24,
        36,
        49.5,
        66,
        ...Array.from({ length: 165 }, (_, index) => 75 + index / 2),
        167,
      ].forEach((frame) =>
        _assertAgreementClearance({ input: candidate, frame }),
      );
      assert.match(
        _render({ frame: 150, input: candidate }),
        /data-agreed-caption-guide=/,
      );
    });
  });
  Array.from(
    { length: Math.max(0, Math.floor((30 - 1) / 1) + 1) },
    (_, sampleIndex) => 1 + sampleIndex * 1,
  ).forEach((prefix) => {
    const candidate = {
      ...fixtures[2].input,
      requests: fixtures[2].input.requests.map((request) => ({
        ...request,
        participant: `界 ${"界".repeat(prefix)} ${"界".repeat(24)}`.slice(
          0,
          24,
        ),
      })),
      labels: {
        ...fixtures[2].input.labels,
        agreed: `語 ${"語".repeat(prefix)} ${"語".repeat(30)}`.slice(0, 30),
      },
    };
    [90, 150].forEach((frame) =>
      _assertAgreementClearance({ input: candidate, frame }),
    );
  });
});
