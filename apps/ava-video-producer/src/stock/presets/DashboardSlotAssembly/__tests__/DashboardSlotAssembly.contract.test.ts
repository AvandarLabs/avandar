import assert from "node:assert/strict";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { dashboardSlotAssemblyContract } from "../DashboardSlotAssembly.contract";
import { DEFAULT_INPUT, fixtures } from "../DashboardSlotAssembly.fixtures";
import { inputSchema } from "../DashboardSlotAssembly.schema";
import {
  _render,
  _getVisibleTextsFromInput,
  _getPanelsFromMarkup,
  _getPanelFromMarkup,
  _getRectFromPanel,
  _getPanelMarkupFromId,
} from "./DashboardSlotAssemblyTestHelpers";

registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  contract: dashboardSlotAssemblyContract,
  render: ({ frame, input }) =>
    `${_render({ frame, input })}${_render({
      frame,
      input: {
        ...input,
        layout:
          input.layout === "feature-left" ? "feature-top" : "feature-left",
      },
    })}`,
  excludedTextFields: ["id", "kind", "featuredWidgetId", "layout"],
  getVisibleTexts: _getVisibleTextsFromInput,
  textFrames: [36, 80, 150],
  invalidInputs: [
    {},
    { ...DEFAULT_INPUT, extra: true },
    { ...DEFAULT_INPUT, featuredWidgetId: "missing" },
    { ...DEFAULT_INPUT, widgets: [] },
    {
      ...DEFAULT_INPUT,
      widgets: [DEFAULT_INPUT.widgets[0], DEFAULT_INPUT.widgets[0]],
    },
    {
      ...DEFAULT_INPUT,
      widgets: [
        { ...DEFAULT_INPUT.widgets[0], lines: ["A", "B"] },
        DEFAULT_INPUT.widgets[1],
      ],
    },
    {
      ...DEFAULT_INPUT,
      widgets: [
        { ...DEFAULT_INPUT.widgets[0], title: "W".repeat(29) },
        DEFAULT_INPUT.widgets[1],
      ],
    },
    {
      ...DEFAULT_INPUT,
      widgets: [
        { ...DEFAULT_INPUT.widgets[0], lines: ["W".repeat(39)] },
        DEFAULT_INPUT.widgets[1],
      ],
    },
  ],
});

test("changing the featured widget reassigns the reserved slot and every remaining slot", () => {
  const before = _render({ frame: 150 });
  const after = _render({
    frame: 150,
    input: { ...DEFAULT_INPUT, featuredWidgetId: "supplies" },
  });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: _getPanelFromMarkup({ markup: before, id: "stock" }),
      name: "x",
    }),
    24,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: _getPanelFromMarkup({ markup: after, id: "supplies" }),
      name: "x",
    }),
    24,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: _getPanelFromMarkup({ markup: after, id: "stock" }),
      name: "x",
    }),
    432,
  );
  assert.notEqual(
    SvgAttributes.getNumberFromMarkup({
      attributes: _getPanelFromMarkup({ markup: before, id: "note" }),
      name: "y",
    }),
    SvgAttributes.getNumberFromMarkup({
      attributes: _getPanelFromMarkup({ markup: after, id: "stock" }),
      name: "y",
    }),
  );
});

test("featured docking precedes the staggered support panels without stretching text", () => {
  const input = fixtures[2].input;
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: _getPanelFromMarkup({
        markup: _render({ frame: 64, input }),
        id: "widget 3",
      }),
      name: "width",
    }),
    396,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: _getPanelFromMarkup({
        markup: _render({ frame: 64, input }),
        id: "widget 0",
      }),
      name: "width",
    }),
    504,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: _getPanelFromMarkup({
        markup: _render({ frame: 112, input }),
        id: "widget 0",
      }),
      name: "width",
    }),
    504,
  );
  [12, 24, 40, 52, 64, 76, 88, 100, 112, 150, 166].forEach((frame) => {
    const markup = _render({ frame, input });
    assert.doesNotMatch(markup, /scale\(/);
    assert.equal((markup.match(/font-size="14"/g) ?? []).length, 4);
    assert.equal(_getPanelsFromMarkup(markup).length, input.widgets.length);
  });
});

test("all collection sizes stay on canvas and finish with nonoverlapping slots", () => {
  (["feature-left", "feature-top"] as const).forEach((layout) => {
    [2, 3, 4].forEach((numWidgets) => {
      const widgets = fixtures[2].input.widgets.slice(0, numWidgets);
      widgets.forEach(({ id }) => {
        const input = {
          ...fixtures[2].input,
          widgets,
          featuredWidgetId: id,
          layout,
        };
        [12, 14, 16, 18, 36, 40, 52, 64, 76, 88, 100, 112, 150, 166].forEach(
          (frame) => {
            const rects = _getPanelsFromMarkup(_render({ frame, input })).map(
              (element) => ({
                x: SvgAttributes.getNumberFromMarkup({
                  attributes: element,
                  name: "x",
                }),
                y: SvgAttributes.getNumberFromMarkup({
                  attributes: element,
                  name: "y",
                }),
                width: SvgAttributes.getNumberFromMarkup({
                  attributes: element,
                  name: "width",
                }),
                height: SvgAttributes.getNumberFromMarkup({
                  attributes: element,
                  name: "height",
                }),
              }),
            );
            assert.equal(rects.length, numWidgets);
            rects.forEach((rect, index) => {
              assert.ok(rect.x >= 0 && rect.x + rect.width <= 960);
              assert.ok(rect.y >= 0 && rect.y + rect.height <= 600);
              if (frame < 112) {
                return;
              }
              rects
                .slice(index + 1)
                .forEach((other) =>
                  assert.ok(
                    rect.x + rect.width <= other.x ||
                      other.x + other.width <= rect.x ||
                      rect.y + rect.height <= other.y ||
                      other.y + other.height <= rect.y,
                  ),
                );
            });
          },
        );
      });
    });
  });
});

test("guides withdraw while authored empty titles, lines and scope remain valid", () => {
  assert.deepEqual(inputSchema.parse(fixtures[1].input), fixtures[1].input);
  assert.match(_render({ frame: 80 }), /data-alignment-guides=/);
  assert.doesNotMatch(_render({ frame: 150 }), /data-alignment-guides=/);
  assert.doesNotMatch(
    _render({ frame: 80, input: { ...DEFAULT_INPUT, showGuides: false } }),
    /data-alignment-guides=/,
  );
});

test("dense title and content baselines stay inside each moving panel", () => {
  (["feature-left", "feature-top"] as const).forEach((layout) => {
    const input = { ...fixtures[2].input, layout };
    [12, 36, 52, 64, 76, 88, 100, 112, 150].forEach((frame) => {
      const markup = _render({ frame, input });
      input.widgets.forEach(({ id }) => {
        const rect = _getPanelFromMarkup({ markup, id });
        const top = SvgAttributes.getNumberFromMarkup({
          attributes: rect,
          name: "y",
        });
        const bottom =
          top +
          SvgAttributes.getNumberFromMarkup({
            attributes: rect,
            name: "height",
          });
        const textElements = _getPanelMarkupFromId({ markup, id }).matchAll(
          /<text([^>]*)>([\s\S]*?)<\/text>/g,
        );
        Array.from(textElements).forEach(([, attributes, content]) => {
          const size = SvgAttributes.getNumberFromMarkup({
            attributes,
            name: "font-size",
          });
          let baseline = SvgAttributes.getNumberFromMarkup({
            attributes,
            name: "y",
          });
          Array.from(content.matchAll(/<tspan([^>]*)>/g)).forEach(
            ([, lineAttributes]) => {
              baseline += SvgAttributes.getNumberFromMarkup({
                attributes: lineAttributes,
                name: "dy",
              });
              assert.ok(baseline - size >= top, `${id} top at ${frame}`);
              assert.ok(
                baseline + size * 0.25 <= bottom,
                `${id} bottom at ${frame}`,
              );
            },
          );
        });
      });
    });
  });
});

test("loose setup uses distinct readable panels independent of final layout and feature choice", () => {
  const input = fixtures[2].input;
  const expected = [
    { x: 24, y: 108, width: 336, height: 168 },
    { x: 472, y: 124, width: 464, height: 232 },
    { x: 48, y: 348, width: 408, height: 240 },
    { x: 496, y: 368, width: 440, height: 220 },
  ];
  (["feature-left", "feature-top"] as const).forEach((layout) => {
    input.widgets.forEach(({ id: featuredWidgetId }) => {
      [12, 18, 36, 40].forEach((frame) => {
        const markup = _render({
          frame,
          input: { ...input, layout, featuredWidgetId },
        });
        input.widgets.forEach(({ id }, index) =>
          assert.deepEqual(_getRectFromPanel({ markup, id }), expected[index]),
        );
      });
    });
  });
});
