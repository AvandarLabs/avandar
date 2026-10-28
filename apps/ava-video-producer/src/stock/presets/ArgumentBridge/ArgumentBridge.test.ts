import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { ArgumentBridge } from "./ArgumentBridge";
import { argumentBridgeContract as contract } from "./ArgumentBridge.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./ArgumentBridge.fixtures";
import { inputSchema } from "./ArgumentBridge.schema";
import type { Input } from "./ArgumentBridge.schema";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      { viewBox: "0 0 960 600" },
      createElement(ArgumentBridge, {
        frame,
        input,
        accent: "#aabbcc",
        id: "test",
      }),
    ),
  );
}
registerStockPresetAssertions({
  contract,
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  render: _render,
  excludedTextFields: ["id", "relationship"],
});

test("every supplied premise builds its own physical support beneath the authored conclusion", () => {
  [DEFAULT_INPUT, fixtures[2].input].forEach((input) => {
    const held = _render({ frame: 150, input: input });
    assert.equal(
      (held.match(/data-premise-join=/g) ?? []).length,
      input.premises.length,
    );
    assert.equal(
      (held.match(/data-premise=/g) ?? []).length,
      input.premises.length,
    );
    input.premises.forEach(({ id, text }) => {
      assert.ok(held.includes(`data-premise="${id}"`));
      assert.ok(held.includes(`aria-label="${text}"`));
    });
    assert.equal(
      SvgAttributes.getNumberFromMarkup({
        attributes: SvgAttributes.fromMarker({
          markup: held,
          marker: "bridge-deck",
        }),
        name: "y1",
      }),
      350,
    );
    assert.match(
      SvgAttributes.fromMarker({ markup: held, marker: "conclusion" }),
      /translate\(0 0\)/,
    );
  });
  assert.match(
    SvgAttributes.fromMarker({
      markup: _render({ frame: 30 }),
      marker: "connector",
    }),
    /opacity="0"/,
  );
  assert.match(
    SvgAttributes.fromMarker({
      markup: _render({ frame: 150 }),
      marker: "connector",
    }),
    /opacity="1"/,
  );
  assert.equal(
    (_render({ frame: 150 }).match(/data-individual-support=/g) ?? []).length,
    2,
  );
  assert.doesNotMatch(
    _render({
      frame: 150,
      input: { ...DEFAULT_INPUT, showIndividualSupports: false },
    }),
    /data-individual-support=/,
  );
  ["supports", "requires", "suggests"].forEach((relationship) => {
    const markup = _render({
      frame: 150,
      input: {
        ...DEFAULT_INPUT,
        relationship: relationship as Input["relationship"],
      },
    });
    assert.match(markup, new RegExp(`data-relationship="${relationship}"`));
    if (relationship === "suggests") {
      assert.match(
        SvgAttributes.fromMarker({ markup, marker: "bridge-deck" }),
        /stroke-dasharray="8 7"/,
      );
    }
    if (relationship === "requires") {
      assert.match(markup, /data-required-brackets=/);
    }
  });
});

test("premise joining arms reach the common deck when central supports are hidden", () => {
  const markup = _render({
    frame: 150,
    input: {
      ...fixtures[2].input,
      showIndividualSupports: false,
    },
  });
  const arms = [...markup.matchAll(/data-premise-join="[^"]+" d="([^"]+)"/g)];
  assert.equal(arms.length, 3);
  arms.forEach(([, path]) => assert.match(path, /V350/));
});
