import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { QueueRelief } from "./QueueRelief";
import { queueReliefContract as contract } from "./QueueRelief.contract";
import { DEFAULT_INPUT, fixtures, invalidInputs } from "./QueueRelief.fixtures";
import { inputSchema, type Input } from "./QueueRelief.schema";
const render = ({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string =>
  renderToStaticMarkup(
    createElement(QueueRelief, { frame, input, accent: "#72d5bd", id: "test" }),
  );
function _items(markup: string) {
  return [...markup.matchAll(/<rect[^>]*data-item-id="[^"]*"[^>]*>/g)].map(
    (match) => match[0],
  );
}
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render,
  excludedTextFields: ["id"],
  getVisibleTexts: ({ input }) => [
    input.queueLabel,
    input.completionLabel,
    input.capacityChangeLabel,
    ...input.serviceSlots.map(prop("label")),
    ...(input.showItemLabels ? input.items.map(prop("label")) : []),
  ],
});
test("closed bays accept no work and the backlog persists until expansion", () => {
  fixtures.forEach(({ input }) =>
    [36, 54, 72, 89].forEach((frame) => {
      const rects = _items(render({ frame: frame, input: input }));
      assert.equal(rects.length, input.items.length);
      input.serviceSlots
        .filter((slot) => !slot.initiallyOpen)
        .forEach((slot) =>
          assert.ok(
            rects.every(
              (rect) => !rect.includes(`data-service-slot="${slot.id}"`),
            ),
          ),
        );
      if (frame >= 54) {
        assert.equal(
          rects.filter((rect) => rect.includes('data-state="queued"')).length,
          input.items.length -
            input.serviceSlots.filter(prop("initiallyOpen")).length,
        );
        assert.equal(
          rects.filter((rect) => rect.includes('data-state="completed"'))
            .length,
          0,
        );
      }
    }),
  );
});
test("waiting work enters newly opened slots in original order and every completion survives", () => {
  fixtures.forEach(({ input }) => {
    const initial = input.serviceSlots.filter(prop("initiallyOpen")).length;
    const starts = new Map<string, number>();
    Array.from({ length: 49 }, (_, index) => 90 + index).forEach((frame) => {
      const rects = _items(render({ frame: frame, input: input }));
      assert.equal(rects.length, input.items.length);
      rects.forEach((rect) => {
        const id = rect.match(/data-item-id="([^"]*)"/)![1];
        if (rect.includes('data-state="entering"') && !starts.has(id)) {
          starts.set(id, frame);
        }
      });
    });
    const waiting = input.items.slice(initial);
    waiting.forEach((item, index) => {
      assert.ok(starts.has(item.id));
      if (index > 0) {
        assert.ok(starts.get(waiting[index - 1].id)! < starts.get(item.id)!);
      }
    });
    const completed = _items(render({ frame: 138, input: input }));
    assert.equal(
      completed.filter((rect) => rect.includes('data-state="completed"'))
        .length,
      input.items.length,
    );
    input.items.forEach((item) =>
      assert.ok(
        completed.some((rect) => rect.includes(`data-item-id="${item.id}"`)),
      ),
    );
    const first = _items(render({ frame: 94, input: input })).find((rect) =>
      rect.includes(`data-item-id="${waiting[0].id}"`),
    )!;
    assert.ok(
      input.serviceSlots.some(
        (slot) =>
          !slot.initiallyOpen &&
          first.includes(`data-service-slot="${slot.id}"`),
      ),
    );
  });
});
test("actual bay outlines unfold and all dense item bounds fit setup travel and final trays", () => {
  const input = fixtures[2].input;
  const bay = (frame: number) =>
    render({ frame: frame, input: input }).match(
      /<rect[^>]*data-slot-id="slot 1"[^>]*>/,
    )![0];
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: bay(54), name: "width" }) <
      SvgAttributes.getNumberFromMarkup({ attributes: bay(90), name: "width" }),
  );
  [fixtures[2].input, fixtures[4].input].forEach((document) =>
    Array.from({ length: 139 }, (_, frame) => frame).forEach((frame) =>
      _items(render({ frame: frame, input: document })).forEach((rect) => {
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
      }),
    ),
  );
  const final = _items(render({ frame: 150, input: fixtures[4].input }));
  final.slice(1).forEach((rect, index) =>
    assert.ok(
      SvgAttributes.getNumberFromMarkup({
        attributes: final[index],
        name: "y",
      }) +
        SvgAttributes.getNumberFromMarkup({
          attributes: final[index],
          name: "height",
        }) <
        SvgAttributes.getNumberFromMarkup({ attributes: rect, name: "y" }),
    ),
  );
});
