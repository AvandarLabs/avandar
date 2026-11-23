import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ScheduleBuffer } from "../../ScheduleBuffer";
import { type Input } from "../../ScheduleBuffer.schema";

function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(ScheduleBuffer, {
        frame,
        input,
        id: "test",
        accent: "#65e2bf",
      }),
    ),
  );
}

function _texts({ input }: Readonly<{ input: Input }>): string[] {
  return [
    input.resultLabel,
    ...input.tasks.map(prop("label")),
    input.interruption.label,
    ...Object.values(input.scheduleLabels),
    ...(input.showValues ? [input.unitLabel] : []),
  ];
}
/** Shared authored fixtures and renderers for this preset's assertions. */
export const ScheduleBufferTestState = { render: _render, texts: _texts };
