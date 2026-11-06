import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import type { StockContract } from "../../src/stock/contracts/StockContract.types";

/** Shared checks for one complete authored input type. */
export type PresetAssertions<Input extends object> = Pick<
  StockContract<Input>,
  "inputSchema" | "defaultInput" | "fixtures"
> & {
  contract: StockContract<Input>;
  invalidInputs: readonly unknown[];
  render: (options: Readonly<{ frame: number; input: Input }>) => string;
  excludedTextFields: readonly string[];
  /**
   * Expected authored copy for the supplied frame, independent of SVG output.
   */
  getVisibleTexts?: (
    options: Readonly<{ input: Input; frame: number }>,
  ) => string[];
  /**
   * Frames whose state-specific copy is checked. Defaults to the hold frame.
   */
  textFrames?: readonly number[];
};

function _assertFixtureSeeks<Input extends object>({
  inputSchema,
  fixtures,
  render,
  excludedTextFields,
  getVisibleTexts,
  textFrames = [150],
}: Readonly<PresetAssertions<Input>>): void {
  fixtures.forEach(({ input }) => {
    assert.deepEqual(inputSchema.parse(input), input);
    const frames = [0, 36, 72, 108, 150, 179];
    const samples = frames.map((frame) =>
      render({ frame: frame, input: input }),
    );
    textFrames.forEach((frame) => {
      const markup = render({ frame: frame, input: input });
      const texts =
        getVisibleTexts?.({ input: input, frame: frame }) ??
        _getTextsFromInput({
          value: input,
          excludedFields: excludedTextFields,
        });
      texts.forEach((text) =>
        assert.ok(markup.includes(`aria-label="${text}"`), text),
      );
    });
    [...frames]
      .reverse()
      .forEach((frame) =>
        assert.equal(
          render({ frame: frame, input: input }),
          samples[frames.indexOf(frame)],
        ),
      );
  });
}

function _assertContract<Input extends object>({
  contract,
  inputSchema,
  defaultInput,
}: Readonly<PresetAssertions<Input>>): void {
  assert.equal(contract.jsonSchema.additionalProperties, false);
  assert.deepEqual(
    contract.controls.map(prop("path")),
    Object.keys(defaultInput),
  );
  contract.bindingExamples.forEach(({ input }) =>
    assert.deepEqual(inputSchema.parse(input), input),
  );
  assert.deepEqual(contract.defaultInput, defaultInput);
  const serialized = JSON.stringify(contract.metadata);
  assert.doesNotMatch(
    serialized,
    /proposalSources|sourceRefs|business-plan-primary|values-pdf/,
  );
}

function _assertTextStress<Input extends object>({
  inputSchema,
  fixtures,
  render,
  excludedTextFields,
  getVisibleTexts,
  textFrames = [150],
}: Readonly<PresetAssertions<Input>>): void {
  [
    ...Array.from({ length: 24 }, (_, index) => `packing-${index + 1}`),
    "prefix",
    "whitespace",
    "graphemes",
  ].forEach((mode) => {
    const input = inputSchema.parse(
      _createStressedInput({
        value: fixtures[2].input,
        mode,
        excludedFields: excludedTextFields,
      }),
    );
    textFrames.forEach((frame) => {
      const markup = render({ frame: frame, input: input });
      const texts =
        getVisibleTexts?.({ input: input, frame: frame }) ??
        _getTextsFromInput({
          value: input,
          excludedFields: excludedTextFields,
        });
      texts.forEach((text) =>
        assert.ok(markup.includes(`aria-label="${text}"`), text),
      );
      assert.doesNotMatch(markup, />[\u0300-\u036f\u200d]/u);
    });
  });
}

/** Register the four shared fixture, schema, contract, and text assertions. */
export function registerStockPresetAssertions<Input extends object>(
  options: Readonly<PresetAssertions<Input>>,
): void {
  test("accepted fixtures draw deterministically across backward seeks", () => {
    _assertFixtureSeeks(options);
  });
  test("strict schemas reject incomplete, extra, out-of-bound and invalid collection inputs", () => {
    options.invalidInputs.forEach((input) =>
      assert.equal(
        options.inputSchema.safeParse(input).success,
        false,
        JSON.stringify(input),
      ),
    );
  });
  test("complete contracts expose recursive editable inputs and valid bindings", () => {
    _assertContract(options);
  });
  test("maximum accepted labels preserve whitespace, inefficient packing and whole graphemes", () => {
    _assertTextStress(options);
  });
}

function _getTextsFromInput({
  value,
  excludedFields,
}: {
  value: unknown;
  excludedFields: readonly string[];
}): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) =>
      _getTextsFromInput({ value: item, excludedFields }),
    );
  }
  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([key]) => !excludedFields.includes(key))
      .flatMap(([, item]) =>
        _getTextsFromInput({ value: item, excludedFields }),
      );
  }
  return [];
}

/** Inputs for createStressedInput. */
type CreateStressedInputOptions = {
  value: unknown;
  mode: string;
  excludedFields: readonly string[];
  key?: string;
};

function _createStressedInput({
  value,
  mode,
  excludedFields,
  key = "",
}: CreateStressedInputOptions): unknown {
  if (typeof value === "string") {
    return excludedFields.includes(key)
      ? value
      : _buildStressedText({ value, mode });
  }
  if (Array.isArray(value)) {
    return value.map((item) =>
      _createStressedInput({ value: item, mode, excludedFields, key }),
    );
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([field, item]) => [
        field,
        _createStressedInput({ value: item, mode, excludedFields, key: field }),
      ]),
    );
  }
  return value;
}

function _buildStressedText({
  value,
  mode,
}: {
  value: string;
  mode: string;
}): string {
  if (mode === "whitespace") {
    return "A\nB\tC\nD".slice(0, Math.max(value.length, 1));
  }
  if (mode === "graphemes") {
    return "é👩‍🔬".repeat(Math.floor(value.length / 7)) || "é";
  }
  const packingWidth = Number(mode.split("-")[1]) || 8;
  const lengths = mode.startsWith("packing")
    ? Array.from({ length: 70 }, () => packingWidth)
    : [1, 15, 15, 15, 15];
  return lengths
    .map((length) => "界".repeat(length))
    .join(" ")
    .slice(0, value.length);
}
