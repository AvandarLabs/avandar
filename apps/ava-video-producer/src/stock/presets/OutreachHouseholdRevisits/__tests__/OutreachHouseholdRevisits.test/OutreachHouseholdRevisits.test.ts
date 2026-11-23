import { OutreachHouseholdRevisitsTestState } from "./OutreachHouseholdRevisitsTestState";

const {
  render: _render,
  attributes: _attributes,
  ASSERTIONS,
} = OutreachHouseholdRevisitsTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { outreachHouseholdRevisitsContract } from "../../OutreachHouseholdRevisits.contract";
import {
  DEFAULT_INPUT,
  changedInput,
  invalidInputs,
} from "../../OutreachHouseholdRevisits.fixtures";
import { inputSchema } from "../../OutreachHouseholdRevisits.schema";
import { assertRepeatedActivityLeavesOneContacted as _assertRepeatedActivityLeavesOneContacted } from "./assertRepeatedActivityLeavesOneContacted";
import { assertRepeatedActivityLeavesOneFinal as _assertRepeatedActivityLeavesOneFinal } from "./assertRepeatedActivityLeavesOneFinal";

test("invalid authored inputs reject before rendering", () => {
  invalidInputs.forEach((input) => {
    return assert.equal(inputSchema.safeParse(input).success, false);
  });
});

test("repeated activity leaves one contacted household after a later failed contact", () => {
  const first = _render({ frame: 60, input: changedInput });
  const contacted = _render({ frame: 84, input: changedInput });
  const final = _render({ frame: 150, input: changedInput });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: _attributes({
        markup: first,
        attribute: "data-household-id",
        value: "h1",
      }),
      name: "data-events",
    }),
    1,
  );
  assert.ok(
    _attributes({
      markup: first,
      attribute: "data-household-id",
      value: "h1",
    }).includes('data-state="no-contact"'),
  );
  _assertRepeatedActivityLeavesOneContacted({ contacted, final });
  assert.ok(final.includes('data-unique-contacted="1"'));
  _assertRepeatedActivityLeavesOneFinal(final);
});

registerStockPresetAssertions(ASSERTIONS);

registerStockTextLayoutAssertions(ASSERTIONS);

test("concentrated visits keep event stamps inside their owning home footprint", () => {
  const markup = _render({ frame: 150, input: changedInput });
  const stamps = markup.match(/<circle[^>]*data-visit-stamp="h1"[^>]*>/g) ?? [];
  assert.equal(stamps.length, 3);
  stamps.forEach((stamp) => {
    assert.ok(
      SvgAttributes.getNumberFromMarkup({ attributes: stamp, name: "cy" }) +
        SvgAttributes.getNumberFromMarkup({ attributes: stamp, name: "r" }) <=
        120 + 0.24 * 270 + 20,
    );
  });
});

test("close accepted homes keep their exact centers and separate fixed label rows", () => {
  const input = inputSchema.parse({
    ...DEFAULT_INPUT,
    households: [
      { id: "a", label: "界".repeat(16), x: 0.1, y: 0.1 },
      { id: "b", label: "界".repeat(16), x: 0.1, y: 0.28 },
      { id: "c", label: "界".repeat(16), x: 0.1, y: 0.46 },
    ],
    visits: [{ householdId: "a", contacted: true }],
  });
  const markup = _render({ frame: 150, input: input });
  input.households.forEach((household, index) => {
    const outline = _attributes({
      markup,
      attribute: "data-home-outline",
      value: household.id,
    });
    const x = 80 + household.x * 480;
    const y = 120 + household.y * 270;
    assert.ok(outline.includes(`M${x - 18} ${y - 3} L${x} ${y - 20}`));
    assert.ok(markup.includes(`<tspan x="650" dy="0">`));
    assert.ok(markup.includes(`x="650" y="${112 + index * 38}"`));
  });
});

test("serialized contract exposes household identity validation", () => {
  // This assertion exercises the JSON serialization boundary of the public
  // contract.
  // react-doctor-disable-next-line no-json-parse-stringify-clone
  const rules = JSON.parse(
    JSON.stringify(outreachHouseholdRevisitsContract.semanticRules),
  ) as typeof outreachHouseholdRevisitsContract.semanticRules;
  const paths = ["households.*.id"];
  const rule = rules.find((candidate) => {
    return (
      candidate.paths.length === paths.length &&
      paths.every((path) => {
        return candidate.paths.includes(path);
      })
    );
  });
  assert.ok(rule, "Runtime-only rule retains its precise field paths.");
  assert.match(rule.description, /unique/i);
});

test("serialized contract exposes household separation validation", () => {
  // This assertion exercises the JSON serialization boundary of the public
  // contract.
  // react-doctor-disable-next-line no-json-parse-stringify-clone
  const rules = JSON.parse(
    JSON.stringify(outreachHouseholdRevisitsContract.semanticRules),
  ) as typeof outreachHouseholdRevisitsContract.semanticRules;
  const paths = ["households.*.x", "households.*.y"];
  const rule = rules.find((candidate) => {
    return (
      candidate.paths.length === paths.length &&
      paths.every((path) => {
        return candidate.paths.includes(path);
      })
    );
  });
  assert.ok(rule, "Runtime-only rule retains its precise field paths.");
  assert.match(rule.description, /Euclidean.*at least 0\.18/i);
});

test("serialized contract exposes visit reference validation", () => {
  // This assertion exercises the JSON serialization boundary of the public
  // contract.
  // react-doctor-disable-next-line no-json-parse-stringify-clone
  const rules = JSON.parse(
    JSON.stringify(outreachHouseholdRevisitsContract.semanticRules),
  ) as typeof outreachHouseholdRevisitsContract.semanticRules;
  const paths = ["visits.*.householdId", "households.*.id"];
  const rule = rules.find((candidate) => {
    return (
      candidate.paths.length === paths.length &&
      paths.every((path) => {
        return candidate.paths.includes(path);
      })
    );
  });
  assert.ok(rule, "Runtime-only rule retains its precise field paths.");
  assert.match(rule.description, /every.*must reference.*supplied household/i);
});

test("serialized contract exposes revisit limit validation", () => {
  // This assertion exercises the JSON serialization boundary of the public
  // contract.
  // react-doctor-disable-next-line no-json-parse-stringify-clone
  const rules = JSON.parse(
    JSON.stringify(outreachHouseholdRevisitsContract.semanticRules),
  ) as typeof outreachHouseholdRevisitsContract.semanticRules;
  const paths = ["visits.*.householdId"];
  const rule = rules.find((candidate) => {
    return (
      candidate.paths.length === paths.length &&
      paths.every((path) => {
        return candidate.paths.includes(path);
      })
    );
  });
  assert.ok(rule, "Runtime-only rule retains its precise field paths.");
  assert.match(rule.description, /at most 3 visits per household/i);
});
