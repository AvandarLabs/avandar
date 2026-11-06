import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { registerStockLocalizationAssertions } from "../../../../../tests/helpers/registerStockLocalizationAssertions";
import { registerStockPresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { SvgPaintAssertions } from "../../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
import { proseMeasurementLedgerContract as contract } from ".././ProseMeasurementLedger.contract";
import { DEFAULT_INPUT, fixtures } from ".././ProseMeasurementLedger.fixtures";
import { inputSchema } from ".././ProseMeasurementLedger.schema";
import {
  render,
  _marker,
  options,
  _assertReadablePaint,
} from "./ProseMeasurementLedgerTestHelpers";

test("each exact span supplies its semantic cell without method-dependent review changes", () => {
  const original = render({ frame: 150 });
  [
    "subject:West site",
    "metric:received",
    "value:12",
    "unit:crates",
    "period:week 2",
    "qualifier:about",
  ].forEach((pair) => {
    const [role, value] = pair.split(":");
    assert.ok(original.includes(`data-role="${role}" data-value="${value}"`));
  });
  const changed = render({ frame: 150, input: fixtures[3].input });
  assert.match(changed, /data-role="subject" data-value="West"/);
  assert.match(changed, /data-role="unit" data-value="crates"/);
  assert.match(changed, /data-review="needs-review"/);
  assert.match(changed, /data-method="model-assisted"/);
  assert.match(
    changed,
    /aria-label="West site reported about 12 crates received in week 2\."/,
  );
});

test("selected fragments travel from the sentence into separate labeled slots", () => {
  const start = _marker({
      markup: render({ frame: 56 }),
      key: "transfer-role",
      value: "subject",
    }),
    middle = _marker({
      markup: render({ frame: 86 }),
      key: "transfer-role",
      value: "subject",
    }),
    end = _marker({
      markup: render({ frame: 150 }),
      key: "transfer-role",
      value: "subject",
    });
  assert.notEqual(
    SvgAttributes.getNumberFromMarkup({ attributes: start, name: "x" }),
    SvgAttributes.getNumberFromMarkup({ attributes: end, name: "x" }),
  );
  assert.notEqual(
    SvgAttributes.getNumberFromMarkup({ attributes: middle, name: "y" }),
    SvgAttributes.getNumberFromMarkup({ attributes: start, name: "y" }),
  );
  assert.notEqual(
    SvgAttributes.getNumberFromMarkup({ attributes: middle, name: "y" }),
    SvgAttributes.getNumberFromMarkup({ attributes: end, name: "y" }),
  );
});

registerStockPresetAssertions(options);

registerStockTextLayoutAssertions(options);

registerStockLocalizationAssertions({
  contract,
  expectedTextPaths: [
    ["fragments", 0, "text"],
    ["fragments", 1, "text"],
    ["fragments", 2, "text"],
    ["fragments", 3, "text"],
    ["fragments", 4, "text"],
    ["fragments", 5, "text"],
    ["copy", "context"],
    ["copy", "source"],
    ["copy", "result"],
  ],
  boundTranslations: [
    {
      path: ["fragments", 0, "text"],
      template: "<content>Lieu</content> ",
      text: "Lieu ",
      start: 0,
      end: 4,
    },
    {
      path: ["fragments", 1, "text"],
      template: "<content>env.</content> ",
      text: "env. ",
      start: 0,
      end: 4,
    },
    {
      path: ["fragments", 2, "text"],
      template: "<content>-0.5</content> ",
      text: "-0.5 ",
      start: 0,
      end: 4,
    },
    {
      path: ["fragments", 3, "text"],
      template: "<content>boîtes</content> ",
      text: "boîtes ",
      start: 0,
      end: 6,
    },
    {
      path: ["fragments", 4, "text"],
      template: "<content>reçues</content> ",
      text: "reçues ",
      start: 0,
      end: 6,
    },
    {
      path: ["fragments", 5, "text"],
      template: "en <content>semaine 3</content>.",
      text: "en semaine 3.",
      start: 3,
      end: 12,
    },
  ],
  suppliedInputs: fixtures.map(prop("input")),
});

test("every required top-level field rejects omission", () => {
  Object.keys(DEFAULT_INPUT).forEach((key) => {
    const incomplete = { ...DEFAULT_INPUT };
    Reflect.deleteProperty(incomplete, key);
    assert.equal(inputSchema.safeParse(incomplete).success, false, key);
  });
});

test("zero and negative decimal selections keep exact text and qualifiers", () => {
  ["0", "-0", "-12.5", ".5", "12."].forEach((value) => {
    const input = inputSchema.parse({
      ...DEFAULT_INPUT,
      fragments: DEFAULT_INPUT.fragments.map((fragment) =>
        fragment.role === "value"
          ? {
              ...fragment,
              text: `${value} `,
              contentStart: 0,
              contentEnd: value.length,
            }
          : fragment,
      ),
    });
    assert.ok(
      render({ frame: 150, input: input }).includes(
        `data-role="value" data-value="${value}"`,
      ),
    );
    assert.match(
      render({ frame: 150, input: input }),
      /data-role="qualifier" data-value="about"/,
    );
  });
});

test("maximum authored source spans preserve whole graphemes and complete envelopes", () => {
  const semanticRoles = ["subject", "metric", "unit", "period", "qualifier"];
  semanticRoles.forEach((role) =>
    [
      "界".repeat(20),
      "界 界界界界界界界界界界界界界 界界界界",
      "é👩‍🔬".repeat(2),
      "A\nB\tC",
    ].forEach((text) => {
      const input = inputSchema.parse({
        ...DEFAULT_INPUT,
        fragments: DEFAULT_INPUT.fragments.map((fragment) =>
          fragment.role === role
            ? {
                ...fragment,
                text: `(${text})`,
                contentStart: 1,
                contentEnd: text.length + 1,
              }
            : fragment,
        ),
      });
      [13, 55, 56, 75, 82, 100, 110, 150].forEach((frame) => {
        const markup = render({ frame: frame, input: input });
        SvgPaintAssertions.assertTextCanvasBounds({ markup });
        _assertReadablePaint(markup);
        assert.ok(
          markup.includes(
            `aria-label="${input.fragments.map(prop("text")).join("")}"`,
          ),
        );
      });
    }),
  );
});

test("connector insertion cannot reuse a semantic role's underline pattern", () => {
  const connector = {
    id: "g",
    role: "connector" as const,
    text: " ",
    contentStart: 0,
    contentEnd: 0,
  };
  const input = inputSchema.parse({
    ...DEFAULT_INPUT,
    fragments: [
      DEFAULT_INPUT.fragments[0],
      connector,
      ...DEFAULT_INPUT.fragments.slice(1, 4),
      { ...connector, id: "h" },
      ...DEFAULT_INPUT.fragments.slice(4),
    ],
  });
  const paths = [
    ...render({ frame: 55, input: input }).matchAll(
      /<path[^>]*data-source-span=[^>]*>/g,
    ),
  ].map((match) => match[0]);
  const byRole = new Map(
    paths.map((path) => [
      path.match(/data-source-span="([^"]*)"/)![1],
      path.match(/stroke-dasharray="([^"]*)"/)![1],
    ]),
  );
  assert.equal(new Set(byRole.values()).size, 6);
});

test("dense ProseMeasurementLedger transfer preserves visible text and foreground clearance at frame 90", () => {
  _assertReadablePaint(render({ frame: 90, input: fixtures[2].input }));
});
