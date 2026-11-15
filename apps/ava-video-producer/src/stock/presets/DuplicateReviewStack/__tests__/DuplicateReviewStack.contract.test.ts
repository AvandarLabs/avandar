import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { registerStockPresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { duplicateReviewStackContract as contract } from "../DuplicateReviewStack.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../DuplicateReviewStack.fixtures";
import { inputSchema } from "../DuplicateReviewStack.schema";
import {
  render,
  _cards,
  _texts,
  _assertPairRoles,
  _createPairInput,
} from "./DuplicateReviewStackTestHelpers";

registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render,
  excludedTextFields: ["id", "retainedId", "finalView"],
  textFrames: [36, 150],
  getVisibleTexts: ({ input, frame }) => [
    input.title,
    input.comparisonFieldLabel,
    ...input.groups.flatMap((group) => [
      group.label,
      ...group.records
        .filter(
          (record) =>
            frame < 100 ||
            input.finalView === "comparison-pair" ||
            group.retainedId === null ||
            record.id === group.retainedId,
        )
        .flatMap((record) => [record.label, record.comparisonValue]),
      ...(input.showRecordIds ? group.records.map(prop("id")) : []),
    ]),
  ],
});

test("comparison roles follow every retained index and every alternative through two-group travel", () => {
  [2, 3].forEach((recordCount) => {
    Array.from(
      { length: Math.max(0, Math.ceil((recordCount - 0) / 1)) },
      (_, sampleIndex) => 0 + sampleIndex * 1,
    ).forEach((retainedIndex) => {
      const input = _createPairInput({ recordCount, retainedIndex });
      [true, false].forEach((showRecordIds) => {
        [91, 95, 100, 150].forEach((frame) =>
          _assertPairRoles({
            markup: render({
              frame: frame,
              input: { ...input, showRecordIds },
            }),
            input,
          }),
        );
      });
    });
  });
  const minimum = {
    ...fixtures[1].input,
    finalView: "comparison-pair" as const,
  };
  _assertPairRoles({
    markup: render({ frame: 150, input: minimum }),
    input: minimum,
  });
});

test("three-line comparison roles stay within their group before the next bracket", () => {
  const input = _createPairInput({ recordCount: 3, retainedIndex: 2 });
  const markup = render({ frame: 150, input: input });
  const brackets = [
    ...markup.matchAll(/<path d="M[\d.-]+ ([\d.-]+)v-8h[^>]*>/g),
  ];
  assert.equal(brackets.length, 2);
  const nextGroupTop = Number(brackets[1][1]) - 8;
  const captions = [
    ..._texts({ markup, label: input.labels.retained }),
    ..._texts({ markup, label: input.labels.alternatives }),
  ];
  assert.equal(captions.length, 6);
  captions
    .filter(
      (caption) =>
        SvgAttributes.getNumberFromMarkup({ attributes: caption, name: "y" }) <
        nextGroupTop,
    )
    .forEach((caption) => {
      const spans = [...caption.matchAll(/<tspan\b[^>]*>/g)];
      assert.equal(spans.length, 3);
      const bottom =
        SvgAttributes.getNumberFromMarkup({ attributes: caption, name: "y" }) +
        spans.reduce(
          (sum, [span]) =>
            sum +
            SvgAttributes.getNumberFromMarkup({ attributes: span, name: "dy" }),
          0,
        ) +
        4;
      assert.ok(bottom < nextGroupTop);
    });
});

test("unresolved comparison groups have review status without retained or alternative role labels", () => {
  [0, 1].forEach((unresolvedIndex) => {
    const seed = _createPairInput({ recordCount: 3, retainedIndex: 2 });
    const input = {
      ...seed,
      groups: seed.groups.map((group, index) => ({
        ...group,
        retainedId: index === unresolvedIndex ? null : group.retainedId,
      })),
    };
    const markup = render({ frame: 150, input: input });
    _assertPairRoles({ markup, input });
    assert.equal(_texts({ markup, label: input.labels.retained }).length, 1);
    assert.equal(
      _texts({ markup, label: input.labels.alternatives }).length,
      2,
    );
    assert.equal(_texts({ markup, label: input.labels.unresolved }).length, 1);
    const unresolved = input.groups[unresolvedIndex];
    unresolved.records.forEach((record) =>
      assert.ok(!markup.includes(`data-retained-id="${record.id}"`)),
    );
    assert.ok(markup.includes(`data-unresolved-group="${unresolved.id}"`));
  });
});

test("only explicit retained identities close groups while all candidate tabs remain", () => {
  const markup = render({ frame: 150 });
  assert.match(markup, /data-retained-id="A1"/);
  assert.doesNotMatch(markup, /data-retained-id="B/);
  assert.match(markup, /data-unresolved-group="ink"/);
  ["A1", "A2", "B1", "B2"].forEach((id) =>
    assert.ok(markup.includes(`aria-label="${id}"`)),
  );
  assert.match(
    render({ frame: 150, input: fixtures[1].input }),
    /data-retained-id=""/,
  );
  const changed = render({ frame: 150, input: fixtures[3].input });
  assert.match(changed, /data-retained-id="A2"/);
  assert.match(changed, /data-retained-id="B2"/);
});

test("comparison values align before resolved slips fold and unresolved slips remain separated", () => {
  const initial = _cards(render({ frame: 36 }));
  assert.equal(initial.length, 4);
  const aligned = _cards(render({ frame: 70 }));
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: aligned[0], name: "x" }),
    SvgAttributes.getNumberFromMarkup({ attributes: aligned[1], name: "x" }),
  );
  assert.notEqual(
    SvgAttributes.getNumberFromMarkup({ attributes: initial[0], name: "x" }),
    SvgAttributes.getNumberFromMarkup({ attributes: initial[1], name: "x" }),
  );
  const hold = _cards(render({ frame: 150 }));
  const retained = hold.find((card) =>
      card.includes('data-candidate-id="A1"'),
    )!,
    alternative = hold.find((card) => card.includes('data-candidate-id="A2"'))!;
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: alternative, name: "y" }) <
      SvgAttributes.getNumberFromMarkup({ attributes: retained, name: "y" }) +
        SvgAttributes.getNumberFromMarkup({
          attributes: retained,
          name: "height",
        }),
  );
  const unresolved = hold.filter((card) =>
    card.includes('data-group-id="ink"'),
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({
      attributes: unresolved[0],
      name: "y",
    }) +
      SvgAttributes.getNumberFromMarkup({
        attributes: unresolved[0],
        name: "height",
      }) <
      SvgAttributes.getNumberFromMarkup({
        attributes: unresolved[1],
        name: "y",
      }),
  );
});

test("dense variants keep cards bounded and comparison-pair final cards disjoint", () => {
  (["offset-stack", "comparison-pair"] as const).forEach((finalView) =>
    [36, 42, 70, 85, 100, 150].forEach((frame) => {
      const rects = _cards(
        render({ frame: frame, input: { ...fixtures[2].input, finalView } }),
      );
      assert.equal(rects.length, 6);
      rects.forEach((rect) => {
        const x = SvgAttributes.getNumberFromMarkup({
            attributes: rect,
            name: "x",
          }),
          y = SvgAttributes.getNumberFromMarkup({
            attributes: rect,
            name: "y",
          });
        assert.ok(
          x >= 0 &&
            x +
              SvgAttributes.getNumberFromMarkup({
                attributes: rect,
                name: "width",
              }) <=
              960,
        );
        assert.ok(
          y >= 0 &&
            y +
              SvgAttributes.getNumberFromMarkup({
                attributes: rect,
                name: "height",
              }) <=
              600,
        );
      });
      if (finalView === "comparison-pair" && frame === 150) {
        rects.forEach((rect, index) =>
          rects.slice(index + 1).forEach((other) => {
            const x = SvgAttributes.getNumberFromMarkup({
                attributes: rect,
                name: "x",
              }),
              y = SvgAttributes.getNumberFromMarkup({
                attributes: rect,
                name: "y",
              }),
              ox = SvgAttributes.getNumberFromMarkup({
                attributes: other,
                name: "x",
              }),
              oy = SvgAttributes.getNumberFromMarkup({
                attributes: other,
                name: "y",
              });
            assert.ok(
              x +
                SvgAttributes.getNumberFromMarkup({
                  attributes: rect,
                  name: "width",
                }) <=
                ox ||
                ox +
                  SvgAttributes.getNumberFromMarkup({
                    attributes: other,
                    name: "width",
                  }) <=
                  x ||
                y +
                  SvgAttributes.getNumberFromMarkup({
                    attributes: rect,
                    name: "height",
                  }) <=
                  oy ||
                oy +
                  SvgAttributes.getNumberFromMarkup({
                    attributes: other,
                    name: "height",
                  }) <=
                  y,
            );
          }),
        );
      }
    }),
  );
});
