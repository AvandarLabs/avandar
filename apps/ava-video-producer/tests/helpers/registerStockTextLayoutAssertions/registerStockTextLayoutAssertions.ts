import assert from "node:assert/strict";
import test from "node:test";
import { SvgPaintAssertions } from "../SvgPaintAssertions/SvgPaintAssertions";

type LayoutAssertions<Input extends object> = {
  inputSchema: { parse: (value: unknown) => Input };
  fixtures: ReadonlyArray<{ input: Input }>;
  render: (options: Readonly<{ frame: number; input: Input }>) => string;
  excludedTextFields: readonly string[];
  /**
   * Expected authored copy comes from input and timeline, never rendered SVG.
   */
  getVisibleTexts: (
    options: Readonly<{ input: Input; frame: number }>,
  ) => string[];
};
type PrefixInput = {
  value: unknown;
  wordLength: number;
  excludedTextFields: readonly string[];
  key?: string;
};
function _createPrefixInput({
  value,
  wordLength,
  excludedTextFields,
  key = "",
}: Readonly<PrefixInput>): unknown {
  if (typeof value === "string") {
    return excludedTextFields.includes(key)
      ? value
      : `界 ${"界".repeat(wordLength)} ${"界".repeat(value.length)}`.slice(
          0,
          value.length,
        );
  }
  if (Array.isArray(value)) {
    return value.map((item) =>
      _createPrefixInput({ value: item, wordLength, excludedTextFields, key }),
    );
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([field, item]) => [
        field,
        _createPrefixInput({
          value: item,
          wordLength,
          excludedTextFields,
          key: field,
        }),
      ]),
    );
  }
  return value;
}
function _forEachPrefix<Input extends object>({
  options,
  check,
}: Readonly<{
  options: LayoutAssertions<Input>;
  check: (input: Input, frame: number) => void;
}>): void {
  Array.from({ length: 40 }, (_, index) => index + 1).forEach((wordLength) => {
    const input = options.inputSchema.parse(
      _createPrefixInput({
        value: options.fixtures[2].input,
        wordLength,
        excludedTextFields: options.excludedTextFields,
      }),
    );
    [24, 72, 150].forEach((frame) => check(input, frame));
  });
}
function _escapeAttribute(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
/**
 * Register 40 prefix variants at setup/travel/hold and every second frame of
 * each fixture. The third fixture supplies dense text capacities. Caller-owned
 * exclusions and visible-copy oracles keep scene semantics outside this helper.
 * SVG geometry estimation is delegated to assertSvgTextCanvasBounds.
 */
export function registerStockTextLayoutAssertions<Input extends object>(
  options: Readonly<LayoutAssertions<Input>>,
): void {
  test("every accepted two-word prefix length fits without losing authored text", () => {
    _forEachPrefix({
      options,
      check: (input, frame) => {
        const markup = options.render({ frame: frame, input: input });
        options
          .getVisibleTexts({ input: input, frame: frame })
          .forEach((text) =>
            assert.ok(
              markup.includes(`aria-label="${_escapeAttribute(text)}"`),
              text,
            ),
          );
      },
    });
  });
  test("actual visible text stays inside the canvas during setup, staggered travel and hold", () => {
    options.fixtures.forEach(({ input }) =>
      Array.from({ length: 90 }, (_, index) => index * 2).forEach((frame) =>
        SvgPaintAssertions.assertTextCanvasBounds({
          markup: options.render({ frame: frame, input: input }),
        }),
      ),
    );
    _forEachPrefix({
      options,
      check: (input, frame) =>
        SvgPaintAssertions.assertTextCanvasBounds({
          markup: options.render({ frame: frame, input: input }),
        }),
    });
  });
}
