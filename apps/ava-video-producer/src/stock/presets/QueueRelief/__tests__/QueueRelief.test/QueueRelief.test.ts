import { QueueReliefTestState } from "./QueueReliefTestState";

const { render, items: _items } = QueueReliefTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { queueReliefContract as contract } from "../../QueueRelief.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../../QueueRelief.fixtures";
import { inputSchema } from "../../QueueRelief.schema";
import { assertActualBayOutlinesUnfoldDocument as _assertActualBayOutlinesUnfoldDocument } from "./assertActualBayOutlinesUnfoldDocument";
import { assertWaitingWorkEntersNewlyInput as _assertWaitingWorkEntersNewlyInput } from "./assertWaitingWorkEntersNewlyInput";

registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render,
  excludedTextFields: ["id"],
  getVisibleTexts: ({ input }) => {
    return [
      input.queueLabel,
      input.completionLabel,
      input.capacityChangeLabel,
      ...input.serviceSlots.map(prop("label")),
      ...(input.showItemLabels ? input.items.map(prop("label")) : []),
    ];
  },
});

test("closed bays accept no work and the backlog persists until expansion", () => {
  fixtures.forEach(({ input }) => {
    return [36, 54, 72, 89].forEach((frame) => {
      const rects = _items(render({ frame: frame, input: input }));
      assert.equal(rects.length, input.items.length);
      input.serviceSlots
        .filter((slot) => {
          return !slot.initiallyOpen;
        })
        .forEach((slot) => {
          return assert.ok(
            rects.every((rect) => {
              return !rect.includes(`data-service-slot="${slot.id}"`);
            }),
          );
        });
      if (frame >= 54) {
        assert.equal(
          rects.filter((rect) => {
            return rect.includes('data-state="queued"');
          }).length,
          input.items.length -
            input.serviceSlots.filter(prop("initiallyOpen")).length,
        );
        assert.equal(
          rects.filter((rect) => {
            return rect.includes('data-state="completed"');
          }).length,
          0,
        );
      }
    });
  });
});

test("waiting work enters newly opened slots in original order and every completion survives", () => {
  fixtures.forEach(({ input }) => {
    return _assertWaitingWorkEntersNewlyInput(input);
  });
});

test("actual bay outlines unfold and all dense item bounds fit setup travel and final trays", () => {
  const input = fixtures[2].input;
  const bay = (frame: number) => {
    return render({ frame: frame, input: input }).match(
      /<rect[^>]*data-slot-id="slot 1"[^>]*>/,
    )![0];
  };
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: bay(54), name: "width" }) <
      SvgAttributes.getNumberFromMarkup({ attributes: bay(90), name: "width" }),
  );
  [fixtures[2].input, fixtures[4].input].forEach((document) => {
    return _assertActualBayOutlinesUnfoldDocument(document);
  });
  const final = _items(render({ frame: 150, input: fixtures[4].input }));
  final.slice(1).forEach((rect, index) => {
    return assert.ok(
      SvgAttributes.getNumberFromMarkup({
        attributes: final[index],
        name: "y",
      }) +
        SvgAttributes.getNumberFromMarkup({
          attributes: final[index],
          name: "height",
        }) <
        SvgAttributes.getNumberFromMarkup({ attributes: rect, name: "y" }),
    );
  });
});
