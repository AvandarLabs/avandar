import { ScheduleBufferTestState } from "./ScheduleBufferTestState";

const { render: _render, texts: _texts } = ScheduleBufferTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { scheduleBufferContract } from "../../ScheduleBuffer.contract";
import { DEFAULT_INPUT, FIXTURES } from "../../ScheduleBuffer.fixtures";
import { inputSchema, type Input } from "../../ScheduleBuffer.schema";
import { assertInterruptionConsumesItsExactBefore as _assertInterruptionConsumesItsExactBefore } from "./assertInterruptionConsumesItsExactBefore";

registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures: FIXTURES,
  contract: scheduleBufferContract,
  render: _render,
  excludedTextFields: ["id", "afterTaskId"],
  getVisibleTexts: _texts,
  invalidInputs: [
    {},
    { ...DEFAULT_INPUT, extra: true },
    { ...DEFAULT_INPUT, reserveUnits: 0 },
    {
      ...DEFAULT_INPUT,
      interruption: { ...DEFAULT_INPUT.interruption, duration: 3 },
    },
    {
      ...DEFAULT_INPUT,
      interruption: { ...DEFAULT_INPUT.interruption, afterTaskId: "send" },
    },
    {
      ...DEFAULT_INPUT,
      interruption: { ...DEFAULT_INPUT.interruption, afterTaskId: "unknown" },
    },
    {
      ...DEFAULT_INPUT,
      tasks: DEFAULT_INPUT.tasks.map((task) => {
        return { ...task, id: "same" };
      }),
    },
  ],
});

test("interruption consumes its exact width while later task widths and deadline remain fixed", () => {
  const before = _render({ frame: 44, input: DEFAULT_INPUT });
  const after = _render({ frame: 150, input: DEFAULT_INPUT });
  const reserveBefore = SvgAttributes.fromMarker({
    markup: before,
    marker: "reserve-segment",
  });
  const reserveAfter = SvgAttributes.fromMarker({
    markup: after,
    marker: "reserve-segment",
  });
  const delay = SvgAttributes.getNumberFromMarkup({
    attributes: SvgAttributes.fromMarker({
      markup: after,
      marker: "interruption-segment",
    }),
    name: "width",
  });
  assert.ok(
    Math.abs(
      SvgAttributes.getNumberFromMarkup({
        attributes: reserveBefore,
        name: "width",
      }) -
        SvgAttributes.getNumberFromMarkup({
          attributes: reserveAfter,
          name: "width",
        }) -
        delay,
    ) < 1e-8,
  );
  assert.equal(
    SvgAttributes.fromMarker({ markup: before, marker: "deadline-pin" }),
    SvgAttributes.fromMarker({ markup: after, marker: "deadline-pin" }),
  );
  _assertInterruptionConsumesItsExactBefore({ before, after, delay });
});

test("fully consumed reserve is zero without squeezing maximum task quantities", () => {
  const input: Input = {
    ...FIXTURES[2].input,
    tasks: FIXTURES[2].input.tasks.map((task, index) => {
      return { ...task, duration: [4, 4, 4, 1][index] };
    }),
    reserveUnits: 1,
    interruption: { ...FIXTURES[2].input.interruption, duration: 1 },
  };
  assert.deepEqual(inputSchema.parse(input), input);
  const markup = _render({ frame: 150, input: input });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup,
        marker: "reserve-segment",
      }),
      name: "width",
    }),
    0,
  );
  assert.match(markup, /data-remaining-reserve="0"/);
  const last = [...markup.matchAll(/<rect[^>]*data-task-id="[^"]*"[^>]*>/g)].at(
    -1,
  )![0];
  assert.ok(
    Math.abs(
      SvgAttributes.getNumberFromMarkup({ attributes: last, name: "x" }) +
        SvgAttributes.getNumberFromMarkup({ attributes: last, name: "width" }) -
        920,
    ) < 1e-8,
  );
});

test("task plus interruption plus reserve extents conserve the endpoint throughout travel", () => {
  [74, 84, 96, 108, 118].forEach((frame) => {
    const markup = _render({ frame: frame, input: FIXTURES[2].input });
    const reserve = SvgAttributes.fromMarker({
      markup,
      marker: "reserve-segment",
    });
    assert.ok(
      Math.abs(
        SvgAttributes.getNumberFromMarkup({ attributes: reserve, name: "x" }) +
          SvgAttributes.getNumberFromMarkup({
            attributes: reserve,
            name: "width",
          }) -
          920,
      ) < 1e-8,
    );
    assert.ok(
      SvgAttributes.getNumberFromMarkup({
        attributes: reserve,
        name: "width",
      }) >= 0,
    );
  });
});

test("hiding values removes unit captions while retaining exact segment geometry", () => {
  const markup = _render({
    frame: 150,
    input: { ...DEFAULT_INPUT, showValues: false },
  });
  assert.doesNotMatch(markup, /aria-label="slots"/);
  assert.equal([...markup.matchAll(/data-task-id=/g)].length, 3);
});
