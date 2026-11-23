import { NestedDrilldownWindowTestState } from "./NestedDrilldownWindowTestState";

const { render, slips: _slips } = NestedDrilldownWindowTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { nestedDrilldownWindowContract as contract } from "../../NestedDrilldownWindow.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../../NestedDrilldownWindow.fixtures";
import { inputSchema, type Input } from "../../NestedDrilldownWindow.schema";
import { assertDenseSetupSelectedDetailInput as _assertDenseSetupSelectedDetailInput } from "./assertDenseSetupSelectedDetailInput";

registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render,
  excludedTextFields: ["id", "groups", "selectionPath", "selectionStyle"],
  textFrames: [36, 150],
  getVisibleTexts: ({ input, frame }) => {
    return [
      input.labels.title,
      input.labels.root,
      ...input.selectionPath,
      ...input.records
        .filter((record) => {
          return (
            frame < 40 ||
            input.selectionPath.every((value, index) => {
              return record.groups[index] === value;
            })
          );
        })
        .map(prop("label")),
    ];
  },
});

test("detail membership satisfies the full exact path and preserves the parent breadcrumb", () => {
  const markup = render({ frame: 150 });
  assert.equal((markup.match(/data-detail-id=/g) ?? []).length, 2);
  assert.match(markup, /data-detail-id="a"/);
  assert.match(markup, /data-detail-id="d"/);
  assert.doesNotMatch(markup, /data-detail-id="[bc]"/);
  assert.equal((markup.match(/data-breadcrumb-level=/g) ?? []).length, 2);
  assert.match(markup, /aria-label="All sample records"/);
  const one = render({ frame: 150, input: fixtures[3].input });
  assert.equal((one.match(/data-detail-id=/g) ?? []).length, 3);
  assert.equal((one.match(/data-breadcrumb-level=/g) ?? []).length, 1);
  assert.doesNotMatch(
    render({ frame: 92, input: fixtures[3].input }),
    /data-second-selection=/,
  );
  assert.doesNotMatch(one, /data-parent-context=/);
});

test("the first group window opens before a distinct second narrowing and slips travel", () => {
  const setup = _slips(render({ frame: 36 })),
    hold = _slips(render({ frame: 150 }));
  assert.equal(setup.length, 4);
  assert.equal(hold.length, 2);
  assert.notEqual(
    SvgAttributes.getNumberFromMarkup({ attributes: setup[0], name: "y" }),
    SvgAttributes.getNumberFromMarkup({ attributes: hold[0], name: "y" }),
  );
  assert.doesNotMatch(render({ frame: 60 }), /data-second-selection=/);
  assert.match(render({ frame: 92 }), /data-second-selection=/);
  assert.match(render({ frame: 60 }), /data-first-selection=/);
  const grouped = render({ frame: 36 });
  assert.equal((grouped.match(/data-parent-group=/g) ?? []).length, 2);
});

test("dense setup and selected detail geometry stays bounded through both narrowing beats", () => {
  [fixtures[2].input, fixtures[4].input].forEach((input) => {
    return _assertDenseSetupSelectedDetailInput(input);
  });
});

test("visually similar whitespace groups remain separate exact selections", () => {
  const input: Input = {
    ...DEFAULT_INPUT,
    records: DEFAULT_INPUT.records.map((record, index) => {
      return {
        ...record,
        groups: [index === 0 ? "A B" : "A  B", `${" \t\n\r".repeat(4)}  `],
      };
    }),
    selectionPath: ["A B"],
  };
  const markup = render({ frame: 150, input: input });
  assert.equal((markup.match(/data-detail-id=/g) ?? []).length, 1);
  assert.match(markup, /data-detail-id="a"/);
  assert.ok(
    render({
      frame: 92,
      input: { ...input, selectionPath: ["A B", input.records[0].groups[1]] },
    }).includes(`aria-label="${input.records[0].groups[1]}"`),
  );
  assert.equal(
    inputSchema.safeParse({ ...input, selectionPath: ["A·B"] }).success,
    false,
  );
});
