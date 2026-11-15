import assert from "node:assert/strict";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { mobileClinicRelocationContract } from ".././MobileClinicRelocation.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  changedInput,
  invalidInputs,
  boundaryLabelInputs,
  bookingLabelInputs,
} from ".././MobileClinicRelocation.fixtures";
import { inputSchema, type Input } from ".././MobileClinicRelocation.schema";
import {
  _render,
  _attributes,
  ASSERTIONS,
  _getLabelLineBoxes,
  _assertSiteLabelClearance,
  _assertBookingClearsLabels,
} from "./MobileClinicRelocationTestHelpers";

test("invalid authored inputs reject before rendering", () => {
  invalidInputs.forEach((input) =>
    assert.equal(inputSchema.safeParse(input).success, false),
  );
});

test("one clinic relocates while authored slot assignments conserve finite capacity", () => {
  const before = _render({ frame: 30, input: DEFAULT_INPUT });
  const after = _render({ frame: 150, input: DEFAULT_INPUT });
  assert.equal((before.match(/data-clinic="vehicle"/g) ?? []).length, 1);
  assert.equal((after.match(/data-clinic="vehicle"/g) ?? []).length, 1);
  const start = _attributes({
    markup: before,
    attribute: "data-clinic",
    value: "vehicle",
  });
  const finish = _attributes({
    markup: after,
    attribute: "data-clinic",
    value: "vehicle",
  });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: start, name: "data-x" }),
    70 + 0.18 * 430,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: finish, name: "data-x" }),
    70 + 0.74 * 430,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: finish, name: "data-y" }),
    125 + 0.62 * 200,
  );
  assert.equal((after.match(/data-booking=/g) ?? []).length, 3);
  assert.equal(
    (
      _render({ frame: 150, input: changedInput }).match(/data-person-id=/g) ??
      []
    ).length,
    5,
  );
  assert.equal(
    (_render({ frame: 150, input: changedInput }).match(/data-booking=/g) ?? [])
      .length,
    0,
  );
  const emptyId = _render({ frame: 150, input: fixtures[1].input });
  assert.equal((emptyId.match(/data-booking=""/g) ?? []).length, 1);
  assert.equal((emptyId.match(/data-slot-id=""/g) ?? []).length, 1);
});

registerStockPresetAssertions(ASSERTIONS);

registerStockTextLayoutAssertions(ASSERTIONS);

test("the vehicle body moves with its awning folded and preserves both map contexts", () => {
  ["local-map", "globe-to-local"].forEach((view) => {
    const input = { ...DEFAULT_INPUT, view: view as Input["view"] };
    const first = _attributes({
      markup: _render({ frame: 30, input: input }),
      attribute: "data-clinic",
      value: "vehicle",
    });
    const driving = _attributes({
      markup: _render({ frame: 72, input: input }),
      attribute: "data-clinic",
      value: "vehicle",
    });
    const last = _attributes({
      markup: _render({ frame: 150, input: input }),
      attribute: "data-clinic",
      value: "vehicle",
    });
    const startTransform = first.match(
      /transform="translate\(([^ ]+) ([^)]+)\)"/,
    );
    assert.ok(startTransform);
    assert.ok(Math.abs(Number(startTransform[1]) - 147.4) < 1e-10);
    assert.equal(Number(startTransform[2]), 195);
    assert.ok(last.includes('transform="translate(388.2 249)"'));
    assert.ok(
      SvgAttributes.getNumberFromMarkup({
        attributes: driving,
        name: "data-x",
      }) > 147.4,
    );
    assert.ok(
      SvgAttributes.getNumberFromMarkup({
        attributes: driving,
        name: "data-x",
      }) < 388.2,
    );
    assert.ok(
      _attributes({
        markup: _render({ frame: 72, input: input }),
        attribute: "data-awning",
        value: "clinic",
      }).includes("M-42 -22 H20 L20 -22 H-42 Z"),
    );
    [30, 150].forEach((frame) =>
      assert.ok(
        _render({ frame: frame, input: input }).includes(
          'transform="translate(518 418) scale(',
        ),
      ),
    );
  });
});

[0, 1].forEach((numSites) => {
  test(`safeParse rejects ${numSites} sites without throwing`, () => {
    let result: ReturnType<typeof inputSchema.safeParse> | undefined;
    assert.doesNotThrow(() => {
      result = inputSchema.safeParse({
        ...DEFAULT_INPUT,
        sites: DEFAULT_INPUT.sites.slice(0, numSites),
      });
    });
    assert.equal(result?.success, false);
  });
});

boundaryLabelInputs.forEach((input, index) => {
  [30, 150].forEach((frame) => {
    test(`boundary site labels clear the open vehicle at endpoint ${index}/${frame}`, () => {
      assert.equal(inputSchema.safeParse(input).success, true);
      _assertSiteLabelClearance({
        input,
        markup: _render({ frame: frame, input: input }),
      });
    });
  });
});

test("serialized contract exposes collection identity validation", () => {
  const rules = JSON.parse(
    JSON.stringify(mobileClinicRelocationContract.semanticRules),
  ) as typeof mobileClinicRelocationContract.semanticRules;
  const paths = ["sites.*.id", "slots.*.id", "people.*.id"];
  const rule = rules.find(
    (candidate) =>
      candidate.paths.length === paths.length &&
      paths.every((path) => candidate.paths.includes(path)),
  );
  assert.ok(rule, "Runtime-only rule retains its precise field paths.");
  assert.match(rule.description, /unique within each collection/i);
});

test("serialized contract exposes site separation validation", () => {
  const rules = JSON.parse(
    JSON.stringify(mobileClinicRelocationContract.semanticRules),
  ) as typeof mobileClinicRelocationContract.semanticRules;
  const paths = ["sites.*.x", "sites.*.y"];
  const rule = rules.find(
    (candidate) =>
      candidate.paths.length === paths.length &&
      paths.every((path) => candidate.paths.includes(path)),
  );
  assert.ok(rule, "Runtime-only rule retains its precise field paths.");
  assert.match(rule.description, /Euclidean.*at least 0\.4/i);
});

test("serialized contract exposes booking reference validation", () => {
  const rules = JSON.parse(
    JSON.stringify(mobileClinicRelocationContract.semanticRules),
  ) as typeof mobileClinicRelocationContract.semanticRules;
  const paths = ["people.*.slotId", "slots.*.id"];
  const rule = rules.find(
    (candidate) =>
      candidate.paths.length === paths.length &&
      paths.every((path) => candidate.paths.includes(path)),
  );
  assert.ok(rule, "Runtime-only rule retains its precise field paths.");
  assert.match(
    rule.description,
    /every non-null.*must reference.*supplied slot.*empty string.*null/i,
  );
});

test("serialized contract exposes booking exclusivity validation", () => {
  const rules = JSON.parse(
    JSON.stringify(mobileClinicRelocationContract.semanticRules),
  ) as typeof mobileClinicRelocationContract.semanticRules;
  const paths = ["people.*.slotId"];
  const rule = rules.find(
    (candidate) =>
      candidate.paths.length === paths.length &&
      paths.every((path) => candidate.paths.includes(path)),
  );
  assert.ok(rule, "Runtime-only rule retains its precise field paths.");
  assert.match(rule.description, /at most one.*assigned.*slot/i);
});

bookingLabelInputs.forEach((input, rotation) => {
  test(`occupied slot mapping ${rotation} clears complete site labels`, () => {
    assert.equal(inputSchema.safeParse(input).success, true);
    const markup = _render({ frame: 150, input: input });
    const boxes = input.sites.flatMap(({ label }) =>
      _getLabelLineBoxes({ markup: markup, label: label }),
    );
    assert.equal((markup.match(/data-booking=/g) ?? []).length, 6);
    const paths = input.people.flatMap((person, index) => {
      if (person.slotId === null) {
        return [];
      }
      const path = _attributes({
        markup,
        attribute: "data-booking",
        value: person.slotId,
      });
      const samples = _assertBookingClearsLabels({ path, boxes });
      _assertBookingClearsLabels({ path, boxes, clearance: 3.5 });
      const slotIndex = input.slots.findIndex(({ id }) => id === person.slotId);
      assert.deepEqual(samples[0], { x: 74 + index * 114, y: 418 });
      assert.deepEqual(samples.at(-1), { x: 642, y: 160 + slotIndex * 44 });
      return [path.match(/ d="([^"]+)"/)?.[1]];
    });
    assert.equal(
      new Set(paths).size,
      6,
      "Each assignment retains its own physical connection.",
    );
  });
});
