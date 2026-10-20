import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DisclosureAperture } from "./DisclosureAperture";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./DisclosureAperture.fixtures";
function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: typeof DEFAULT_INPUT }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      { viewBox: "0 0 960 600" },
      createElement(DisclosureAperture, {
        frame,
        input,
        accent: "#aabbcc",
        id: "test",
      }),
    ),
  );
}
test("only declared share fields produce outbound copies while every original remains", () => {
  Array.from(fixtures).forEach((fixture) => {
    const markup = _render({ frame: 150, input: fixture.input });
    assert.equal(
      (markup.match(/data-original-field=/g) ?? []).length,
      fixture.input.fields.length,
    );
    assert.equal(
      (markup.match(/data-outbound-copy=/g) ?? []).length,
      fixture.input.fields.filter(({ disclosure }) => disclosure === "share")
        .length,
    );
    fixture.input.fields.forEach(({ id, disclosure }) =>
      assert.equal(
        markup.includes(`data-outbound-copy="${id}"`),
        disclosure === "share",
      ),
    );
  });
});
test("all-retain creates zero outbound copies or apertures at every frame", () => {
  const input = {
    ...DEFAULT_INPUT,
    fields: DEFAULT_INPUT.fields.map((field) => ({
      ...field,
      disclosure: "retain" as const,
    })),
  };
  Array.from(
    { length: Math.max(0, Math.ceil((180 - 0) / 1)) },
    (_, sampleIndex) => 0 + sampleIndex * 1,
  ).forEach((frame) => {
    const markup = _render({ frame: frame, input: input });
    assert.equal(
      (markup.match(/data-original-field=/g) ?? []).length,
      input.fields.length,
    );
    assert.doesNotMatch(markup, /data-outbound-copy=|data-open-aperture=/);
  });
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { disclosureApertureContract } from "./DisclosureAperture.contract";
import { inputSchema } from "./DisclosureAperture.schema";
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  contract: disclosureApertureContract,
  invalidInputs,
  render: _render,
  excludedTextFields: ["id", "disclosure", "direction"],
});
test("both directions move real copy transforms across the boundary and close each aperture", () => {
  Array.from(["left-to-right", "right-to-left"] as const).forEach(
    (direction) => {
      const input = { ...DEFAULT_INPUT, direction };
      const before = _render({ frame: 18, input: input }),
        decisive = _render({ frame: 48, input: input }),
        hold = _render({ frame: 150, input: input });
      assert.doesNotMatch(before, /data-outbound-copy=/);
      assert.match(decisive, /data-open-aperture="topic"/);
      assert.doesNotMatch(hold, /data-open-aperture=/);
      const original = hold.match(
        /data-original-field="topic" transform="translate\((\d+) (\d+)\)"/,
      );
      const copy = hold.match(
        /data-outbound-copy="topic" transform="translate\((\d+) (\d+)\)"/,
      );
      assert.ok(original);
      assert.ok(copy);
      assert.equal(
        Number(original[1]),
        direction === "left-to-right" ? 60 : 540,
      );
      assert.equal(Number(copy[1]), direction === "left-to-right" ? 540 : 60);
      assert.equal(original[2], copy[2]);
    },
  );
});
test("all label, value and policy-mark toggles retain exact source and outbound quantities", () => {
  Array.from([true, false]).forEach((showLabels) => {
    for (const showValues of [true, false])
      Array.from([true, false]).forEach((showPolicyMarks) => {
        const markup = _render({
          frame: 150,
          input: {
            ...DEFAULT_INPUT,
            showLabels,
            showValues,
            showPolicyMarks,
          },
        });
        assert.equal((markup.match(/data-original-field=/g) ?? []).length, 3);
        assert.equal((markup.match(/data-outbound-copy=/g) ?? []).length, 2);
        assert.equal(
          markup.includes('aria-label="Blue crate"'),
          showLabels && showValues,
        );
        assert.equal(markup.includes('aria-label="Example note"'), showLabels);
        assert.equal(markup.includes("data-policy-mark="), showPolicyMarks);
        if (!showLabels) {
          assert.doesNotMatch(markup, /<text/);
        }
      });
  });
});
