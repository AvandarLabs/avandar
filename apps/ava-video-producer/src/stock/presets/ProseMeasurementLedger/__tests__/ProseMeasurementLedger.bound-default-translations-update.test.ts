import assert from "node:assert/strict";
import test from "node:test";
import { setupI18n } from "@lingui/core";
import { SvgPaintAssertions } from "../../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
import { makeLocalizedStockDataFromContract } from "../../../i18n/makeLocalizedStockDataFromContract";
import { StockCopyMessages } from "../../../i18n/StockCopyMessages";
import { proseMeasurementLedgerContract as contract } from ".././ProseMeasurementLedger.contract";
import { DEFAULT_INPUT, fixtures } from ".././ProseMeasurementLedger.fixtures";
import { inputSchema } from ".././ProseMeasurementLedger.schema";
import {
  render,
  _assertReadablePaint,
  expectedSpanBindings,
} from "./ProseMeasurementLedgerTestHelpers";

test("bound default translations update exact spans for shorter, longer, Unicode and numeric selections", () => {
  [
    {
      index: 0,
      template: "<content>Lieu</content> ",
      text: "Lieu ",
      start: 0,
      end: 4,
      role: "subject",
      value: "Lieu",
    },
    {
      index: 0,
      template: "Informe <content>Sitio oeste</content> ",
      text: "Informe Sitio oeste ",
      start: 8,
      end: 19,
      role: "subject",
      value: "Sitio oeste",
    },
    {
      index: 0,
      template: "À <content>é👩‍🔬</content> ",
      text: "À é👩‍🔬 ",
      start: 2,
      end: 9,
      role: "subject",
      value: "é👩‍🔬",
    },
    {
      index: 2,
      template: "env. <content>-0.5</content> ",
      text: "env. -0.5 ",
      start: 5,
      end: 9,
      role: "value",
      value: "-0.5",
    },
  ].forEach((example) => {
    const translated = Object.fromEntries(
      expectedSpanBindings.map((binding) => [
        StockCopyMessages.getDefaultMessageIdFromPath({
          id: contract.id,
          path: binding.textPath,
        }),
        binding.template,
      ]),
    );
    translated[
      StockCopyMessages.getDefaultMessageIdFromPath({
        id: contract.id,
        path: ["fragments", example.index, "text"],
      })
    ] = example.template;
    const i18n = setupI18n({ locale: "fr", messages: { fr: translated } }),
      resolved = makeLocalizedStockDataFromContract({
        contract,
        i18n,
      }).defaultInput;
    assert.equal(resolved.fragments[example.index].text, example.text);
    assert.equal(resolved.fragments[example.index].contentStart, example.start);
    assert.equal(resolved.fragments[example.index].contentEnd, example.end);
    assert.deepEqual(inputSchema.parse(resolved), resolved);
    assert.ok(
      render({ frame: 150, input: resolved }).includes(
        `data-role="${example.role}" data-value="${example.value}"`,
      ),
    );
  });
});

test("bound default extraction uses one marked translation unit and rejects invalid binding paths", () => {
  const messages = StockCopyMessages.getMessagesFromContract({
    [contract.id]: contract,
  });
  expectedSpanBindings.forEach((binding) =>
    assert.equal(
      messages[
        StockCopyMessages.getDefaultMessageIdFromPath({
          id: contract.id,
          path: binding.textPath,
        })
      ],
      binding.template,
    ),
  );
  [
    { ...expectedSpanBindings[0], textPath: ["missing"] },
    {
      ...expectedSpanBindings[0],
      template: "<content>West</content> site reported ",
    },
    { ...expectedSpanBindings[0], startPath: [] },
    {
      ...expectedSpanBindings[0],
      startPath: ["fragments", 99, "contentStart"],
    },
    { ...expectedSpanBindings[0], endPath: ["fragments", 0, "text"] },
    { ...expectedSpanBindings[0], startPath: ["__proto__", "constructor"] },
  ].forEach((binding) => {
    const invalid = { ...contract, defaultSpanBindings: [binding] };
    assert.throws(
      () =>
        StockCopyMessages.getMessagesFromContract({ [contract.id]: invalid }),
      /span|path/i,
    );
    assert.throws(
      () =>
        makeLocalizedStockDataFromContract({
          contract: invalid,
          i18n: setupI18n({ locale: "en" }),
        }),
      /span|path/i,
    );
  });
});

test("English bound defaults reproduce exact authored content and malformed translated markers reject", () => {
  assert.deepEqual(
    makeLocalizedStockDataFromContract({
      contract,
      i18n: setupI18n({ locale: "en" }),
    }).defaultInput,
    DEFAULT_INPUT,
  );
  [
    "Lieu ",
    "<content>a</content><content>b</content>",
    "<content><content>a</content></content>",
    "</content>a<content>",
  ].forEach((template) => {
    const i18n = setupI18n({
      locale: "fr",
      messages: {
        fr: {
          [StockCopyMessages.getDefaultMessageIdFromPath({
            id: contract.id,
            path: ["fragments", 0, "text"],
          })]: template,
        },
      },
    });
    assert.throws(
      () => makeLocalizedStockDataFromContract({ contract, i18n }),
      /content/,
    );
  });
  const i18n = setupI18n({
    locale: "fr",
    messages: {
      fr: {
        [StockCopyMessages.getDefaultMessageIdFromPath({
          id: contract.id,
          path: ["fragments", 2, "text"],
        })]: "<content>1,5</content> ",
      },
    },
  });
  const resolved = makeLocalizedStockDataFromContract({
    contract,
    i18n,
  }).defaultInput;
  assert.equal(
    inputSchema.safeParse(resolved).success,
    false,
    "Numeric validation remains at the input schema boundary.",
  );
  const authored = inputSchema.parse({
    ...DEFAULT_INPUT,
    fragments: DEFAULT_INPUT.fragments.map((fragment, index) =>
      index === 0
        ? {
            ...fragment,
            text: "<content>Lieu</content> ",
            contentStart: 9,
            contentEnd: 13,
          }
        : fragment,
    ),
  });
  assert.equal(authored.fragments[0].text, "<content>Lieu</content> ");
  assert.equal(authored.fragments[0].contentStart, 9);
  assert.equal(authored.fragments[0].contentEnd, 13);
  assert.ok(
    render({ frame: 150, input: authored }).includes(
      'data-role="subject" data-value="Lieu"',
    ),
  );
});

test("ProseMeasurementLedger transfer sampling preserves visible text and foreground clearance", () => {
  [DEFAULT_INPUT, fixtures[2].input].forEach((input) => {
    Array.from({ length: 111 }, (_, index) => 56 + index / 2).forEach(
      (frame) => {
        SvgPaintAssertions.assertTextCanvasBounds({
          markup: render({ frame: frame, input: input }),
        });
        _assertReadablePaint(render({ frame: frame, input: input }));
      },
    );
  });
});

test("duplicate bound paths reject extraction and default resolution", () => {
  const invalid = {
    ...contract,
    defaultSpanBindings: [expectedSpanBindings[0], expectedSpanBindings[0]],
  };
  assert.throws(
    () => StockCopyMessages.getMessagesFromContract({ [contract.id]: invalid }),
    /Duplicate.*span/,
  );
  assert.throws(
    () =>
      makeLocalizedStockDataFromContract({
        contract: invalid,
        i18n: setupI18n({ locale: "en" }),
      }),
    /Duplicate.*span/,
  );
});
