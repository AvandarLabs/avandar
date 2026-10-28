/** Semantic rendering tests for missed-visit-reconnect. */
import assert from "node:assert/strict";
import test from "node:test";
import { prop, propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MissedVisitReconnect } from "./MissedVisitReconnect";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./MissedVisitReconnect.fixtures";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>) {
  return renderToStaticMarkup(
    createElement(MissedVisitReconnect, {
      frame,
      input,
      accent: "#65d6ad",
      id: "semantic",
    }),
  );
}
test("Contact and booking do not move a person through the clinic door; only the authored attended outcome does, and all original cases retain a final state.", () => {
  const markup = _render({ frame: 150 });
  assert.equal(
    (markup.match(/data-case=/g) ?? []).length,
    DEFAULT_INPUT.cases.length,
  );
  assert.match(markup, /data-outcome="booked"/);
  assert.match(markup, /data-outcome="attended"/);
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { missedVisitReconnectContract } from "./MissedVisitReconnect.contract";
import { inputSchema, type Input } from "./MissedVisitReconnect.schema";

const textLayoutOptions = {
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: ["id", "outcome", "channel"],
  getVisibleTexts: ({ input }: Readonly<{ input: Input }>) => [
    input.sceneLabel,
    ...Object.values(input.places),
    ...input.cases.map(prop("label")),
    input.copy.group,
    ...(input.showAttemptCount ? [input.copy.attempts] : []),
    ...(input.showOutcomeLedger
      ? [
          input.copy.unreached,
          input.copy.contacted,
          input.copy.booked,
          input.copy.attended,
        ]
      : []),
  ],
} satisfies Pick<
  PresetAssertions<Input>,
  | "inputSchema"
  | "fixtures"
  | "render"
  | "excludedTextFields"
  | "getVisibleTexts"
>;
registerStockPresetAssertions({
  ...textLayoutOptions,
  defaultInput: DEFAULT_INPUT,
  invalidInputs,
  contract: missedVisitReconnectContract,
});
registerStockTextLayoutAssertions(textLayoutOptions);

test("only attendance crosses the complete clinic boundary; booking folds onto its own calendar", () => {
  const input = fixtures[2].input;
  [30, 44, 64, 84, 96, 108, 115, 150].forEach((frame) => {
    const markup = _render({ frame: frame, input: input });
    const people = Array.from(
      markup.matchAll(
        /data-returning-person="([^"]*)" transform="translate\(([^ ]+) ([^)]+)\)"/g,
      ),
    );
    assert.equal(people.length, 6);
    people.forEach(([_, id, x, y]) => {
      const item = input.cases.find(propEq("id", id))!;
      assert.ok(Number(x) - 8 >= 200 && Number(x) + 8 <= 925);
      assert.ok(Number(y) - 14 >= 130 && Number(y) + 16 <= 450);
      if (item.outcome !== "attended" || frame <= 91) {
        assert.equal(Number(x), 240);
      }
      if (frame >= 115 && item.outcome === "attended") {
        assert.ok(Number(x) - 8 > 760);
      }
    });
    assert.equal(
      (markup.match(/data-booking=/g) ?? []).length,
      input.cases.filter(propEq("outcome", "booked")).length,
    );
  });
  const markup = _render({ frame: 150, input: input });
  assert.match(markup, /data-group-total="6"/);
  assert.match(markup, /data-attempt-total="18"/);
  assert.match(markup, /data-channel="phone"/);
  assert.match(markup, /data-channel="doorstep"/);
  assert.notEqual(
    _render({ frame: 40, input: input }).match(
      /data-worker="outreach"[^]*?translate\([^)]*\)/,
    )?.[0],
    _render({ frame: 96, input: input }).match(
      /data-worker="outreach"[^]*?translate\([^)]*\)/,
    )?.[0],
  );
  const hidden = _render({
    frame: 150,
    input: {
      ...input,
      showAttemptCount: false,
      showOutcomeLedger: false,
    },
  });
  assert.doesNotMatch(hidden, /data-outcome-count=|data-attempt-total=/);
  assert.equal((hidden.match(/data-case=/g) ?? []).length, 6);
});
