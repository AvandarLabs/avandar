import { ProvenancePeelbackTestState } from "./ProvenancePeelbackTestState";

const { render: _render } = ProvenancePeelbackTestState;

import assert from "node:assert/strict";
import { type Input } from "../../ProvenancePeelback.schema";

/**
 * Asserts both arrangements keep actual paragraph baselines within their
 * upright source sheets.
 */
export function assertBothArrangementsKeepActualFrame({
  frame,
  input,
}: Readonly<{ frame: number; input: Readonly<Input> }>): void {
  const markup = _render({ frame, input });
  const blocks = [
    ...markup.matchAll(
      /data-copy-block="[^"]*" data-bottom="([^"]*)"[^>]*>([\s\S]*?)<\/g>/g,
    ),
  ];
  assert.equal(blocks.length, input.sources.length + 1);
  blocks.forEach(([, bottom, block]) => {
    [
      ...block.matchAll(
        /<text[^>]*y="([^"]*)"[^>]*font-size="([^"]*)"[^>]*>([\s\S]*?)<\/text>/g,
      ),
    ].forEach(([, y, fontSize, content]) => {
      const leading = [...content.matchAll(/ dy="([^"]*)"/g)].reduce(
        (sum, match) => {
          return sum + Number(match[1]);
        },
        0,
      );
      assert.ok(
        Number(y) + leading + Number(fontSize) * 0.3 <= Number(bottom),
        `${y}+${leading} within ${bottom}`,
      );
      assert.ok(Number(y) - Number(fontSize) >= 0);
    });
  });
  assert.doesNotMatch(markup, /<g data-copy-block[^>]*rotate/);
}
