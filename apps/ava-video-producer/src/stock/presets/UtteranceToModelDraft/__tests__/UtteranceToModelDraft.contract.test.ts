/**
 * Behavioral, contract, and text-layout coverage for utterance-to-model-draft.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { setupI18n } from "@lingui/core";
import { registerStockPresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { makeLocalizedStockDataFromContract } from "../../../i18n/makeLocalizedStockDataFromContract";
import { StockCopyMessages } from "../../../i18n/StockCopyMessages";
import { utteranceToModelDraftContract } from ".././UtteranceToModelDraft.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from ".././UtteranceToModelDraft.fixtures";
import { inputSchema, type Input } from ".././UtteranceToModelDraft.schema";
import { _render, options } from "./UtteranceToModelDraftTestHelpers";

registerStockPresetAssertions({
  ...options,
  defaultInput: DEFAULT_INPUT,
  invalidInputs,
  contract: utteranceToModelDraftContract,
});

registerStockTextLayoutAssertions({
  ...options,
  getVisibleTexts: ({
    input,
    frame,
  }: Readonly<{ input: Input; frame: number }>) =>
    frame >= 141 ? options.getVisibleTexts({ input: input }) : [],
});

test("draft references preserve original source and pending never has acceptance", () => {
  [
    DEFAULT_INPUT,
    fixtures[1].input,
    fixtures[2].input,
    fixtures[3].input,
  ].forEach((input) => {
    const markup = _render({ frame: 150, input: input });
    [
      ...input.draft.entities,
      ...input.draft.relationships,
      ...input.draft.attributes,
    ].forEach((item) => {
      assert.match(
        markup,
        new RegExp(
          `data-model-item="${item.id}" data-source-part="${item.partId}"`,
        ),
      );
    });
    assert.ok(
      markup.includes(
        `aria-label="${input.sentenceParts.map(prop("text")).join("")}"`,
      ),
    );
    assert.equal(
      markup.includes('data-acceptance="true"'),
      input.review.outcome === "accept",
    );
  });
  assert.doesNotMatch(
    _render({ frame: 150, input: fixtures[3].input }),
    /data-source-guide=/,
  );
});

test("source slips move and relation arrow direction follows supplied endpoints", () => {
  const start = SvgAttributes.fromMarker({
    markup: _render({ frame: 49 }),
    marker: "phrase-copy",
  });
  const held = SvgAttributes.fromMarker({
    markup: _render({ frame: 60 }),
    marker: "phrase-copy",
  });
  assert.notEqual(
    start.match(/transform="([^"]+)"/)?.[1],
    held.match(/transform="([^"]+)"/)?.[1],
  );
  ["horizontal", "stacked"].forEach((layout) => {
    const relation = DEFAULT_INPUT.draft.relationships[0];
    const input = {
      ...DEFAULT_INPUT,
      modelLayout: layout as Input["modelLayout"],
      draft: {
        ...DEFAULT_INPUT.draft,
        relationships: [
          {
            ...relation,
            fromEntityId: relation.toEntityId,
            toEntityId: relation.fromEntityId,
          },
        ],
      },
    };
    const marker = SvgAttributes.fromMarker({
      markup: _render({ frame: 150, input: input }),
      marker: "relation-arrow",
    });
    assert.match(marker, /data-from="workshop-entity" data-to="tool-entity"/);
    assert.ok(
      Number(marker.match(/data-target-coordinate="([^"]+)"/)?.[1]) <
        Number(marker.match(/data-source-coordinate="([^"]+)"/)?.[1]),
    );
  });
});

test("lexical mapping trims boundaries only and preserves multilingual literal content", () => {
  const cases = [
    ["A tool!", "TOOL", true],
    ["apple", "apple", true],
    ["apple", "pple", true],
    ["The apple", "apple", true],
    ["un café", "café", true],
    ["un café", "cafe", false],
    ["A tool", "Workshop", false],
    ["...", "...", false],
    ["A tool", "A ", false],
    ["a-b", "ab", false],
  ] as const;
  cases.forEach(([text, label, accepted]) => {
    const input = {
      ...DEFAULT_INPUT,
      sentenceParts: DEFAULT_INPUT.sentenceParts.map((part, index) =>
        index === 0 ? { ...part, text } : part,
      ),
      draft: {
        ...DEFAULT_INPUT.draft,
        entities: DEFAULT_INPUT.draft.entities.map((entity, index) =>
          index === 0 ? { ...entity, label } : entity,
        ),
      },
    };
    assert.equal(
      inputSchema.safeParse(input).success,
      accepted,
      JSON.stringify({ text, label }),
    );
  });
});

test("stacked arrowheads enter the destination socket from its right side", () => {
  const markup = _render({
    frame: 150,
    input: { ...DEFAULT_INPUT, modelLayout: "stacked" },
  });
  const head = SvgAttributes.fromMarker({ markup, marker: "direction-head" });
  assert.match(head, /d="M324 429 L314 434 L324 439"/);
  assert.match(markup, /data-relation-hinge=/);
});

test("maximum phrase labels remain exact through whitespace and grapheme mappings", () => {
  ["界 界界界界界界界界界界界界 界界界界界界界", "é👩‍🔬 é👩‍🔬", "W\tW\nW"].forEach(
    (text) => {
      const input = {
        ...fixtures[1].input,
        sentenceParts: fixtures[1].input.sentenceParts.map((part) => ({
          ...part,
          text,
        })),
        draft: {
          ...fixtures[1].input.draft,
          entities: fixtures[1].input.draft.entities.map((entity) => ({
            ...entity,
            label: text,
          })),
          relationships: fixtures[1].input.draft.relationships.map(
            (relation) => ({ ...relation, label: text }),
          ),
        },
      };
      assert.equal(inputSchema.safeParse(input).success, true);
      [0, 48, 49, 80, 105, 150].forEach((frame) =>
        assert.doesNotThrow(() => _render({ frame: frame, input: input })),
      );
      assert.ok(
        _render({ frame: 150, input: input }).includes(`aria-label="${text}"`),
      );
    },
  );
});

test("nested authored default prose is extracted and translated without rewriting inputs", () => {
  const messageId = "motionAtlas.utterance-to-model-draft.default.review.note";
  const messages = StockCopyMessages.getMessagesFromContract({
    [utteranceToModelDraftContract.id]: utteranceToModelDraftContract,
  });
  assert.equal(messages[messageId], DEFAULT_INPUT.review.note);
  const i18n = setupI18n({
    locale: "es",
    messages: { es: { [messageId]: "Texto traducido" } },
    missing: (_locale, id) => id,
  });
  const resolved = makeLocalizedStockDataFromContract({
    contract: utteranceToModelDraftContract,
    i18n,
  });
  assert.equal(resolved.defaultInput.review.note, "Texto traducido");
  assert.notEqual(DEFAULT_INPUT.review.note, "Texto traducido");
  assert.ok(
    _render({ frame: 150 }).includes(
      `aria-label="${DEFAULT_INPUT.review.note}"`,
    ),
  );
});

test("two-line model roles clear three-line authored model labels", () => {
  const input = {
    ...DEFAULT_INPUT,
    copy: { ...DEFAULT_INPUT.copy, entity: "界".repeat(18) },
  };
  const text = _render({ frame: 150, input: input }).match(
    /<text aria-label="界+" x="12" y="19"[^>]*>(.*?)<\/text>/s,
  );
  assert.ok(text);
  const lines = (text[1].match(/<tspan /g) ?? []).length;
  const label = _render({ frame: 150, input: input }).match(
    /<text aria-label="Tool"[^>]+/,
  );
  assert.ok(label);
  assert.ok(
    19 + (lines - 1) * 15.6 + 3 <
      SvgAttributes.getNumberFromMarkup({ attributes: label[0], name: "y" }) -
        14,
  );
});

test("dense optional attributes retain their owner in either model layout", () => {
  ["horizontal", "stacked"].forEach((modelLayout) => {
    fixtures[2].input.draft.entities.forEach((entity) => {
      const input = {
        ...fixtures[2].input,
        modelLayout: modelLayout as Input["modelLayout"],
        draft: {
          ...fixtures[2].input.draft,
          attributes: fixtures[2].input.draft.attributes.map((attribute) => ({
            ...attribute,
            entityId: entity.id,
          })),
        },
      };
      [0, 48, 49, 80, 105, 150].forEach((frame) =>
        assert.doesNotThrow(() => _render({ frame: frame, input: input })),
      );
      assert.ok(
        _render({ frame: 150, input: input }).includes(
          `data-attribute-attachment="${entity.id}"`,
        ),
      );
    });
  });
});

test("opaque model sockets clear every source line during phrase lift", () => {
  [DEFAULT_INPUT, fixtures[2].input].forEach((input) => {
    [55, 60, 65, 90].forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      const sourceBaselines = [
        ...markup.matchAll(
          /data-source-fragment="[^"]+"><text[^>]+y="([\d.]+)"/g,
        ),
      ].map((match) => Number(match[1]));
      assert.equal(sourceBaselines.length, input.sentenceParts.length);
      const sourceBottom = Math.max(...sourceBaselines) + 12;
      const sockets = [
        ...markup.matchAll(
          /data-model-item="([^"]+)"[^>]+transform="translate\(([\d.]+) ([\d.]+)\)"[^>]*>\s*<g>\s*<rect[^>]+width="254"/g,
        ),
      ];
      assert.equal(
        sockets.length,
        input.draft.entities.length +
          input.draft.relationships.length +
          input.draft.attributes.length,
      );
      sockets.forEach((socket) => {
        assert.ok(
          Number(socket[3]) >= sourceBottom + 8,
          `frame ${frame}: ${socket[1]} socket top ${socket[3]} covers source through ${sourceBottom}`,
        );
      });
    });
  });
});
