import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JournalReceipts } from "./JournalReceipts";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./JournalReceipts.fixtures";
/** Inputs for render. */
type RenderInput = {
  entries: Array<{ id: string; label: string }>;
  receipts: Array<{ entryId: string; label: string }>;
  copy: {
    journal: string;
    receiptPocket: string;
    disconnected: string;
    reconnected: string;
    pending: string;
    acknowledged: string;
    example: string;
  };
  foldDirection: "horizontal" | "vertical";
  showIdentifiers: boolean;
  showLabels: boolean;
};

function _render({
  frame,
  input = DEFAULT_INPUT,
}: {
  frame: number;
  input?: RenderInput;
}): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      { viewBox: "0 0 960 600" },
      createElement(JournalReceipts, {
        frame,
        input,
        accent: "#aabbcc",
        id: "test",
      }),
    ),
  );
}
test("only identity-matched receipts flatten tabs while unacknowledged journal entries remain", () => {
  Array.from(fixtures).forEach((fixture) => {
    const markup = _render({ frame: 150, input: fixture.input });
    fixture.input.entries.forEach(({ id }) => {
      const tab = markup.match(
        new RegExp(`<[^>]*data-journal-entry="${id}"[^>]*>`),
      )?.[0];
      assert.ok(tab, id);
      assert.ok(
        tab.includes(
          `data-tab-rise="${fixture.input.receipts.some(({ entryId }) => entryId === id) ? 0 : 28}"`,
        ),
      );
    });
  });
  const initial = _render({ frame: 30 });
  assert.match(initial, /data-tab-rise="28"/);
  assert.doesNotMatch(initial, /data-receipt=/);
});
test("both accordion directions align actual receipt geometry to its entry after arrival", () => {
  Array.from(["horizontal", "vertical"] as const).forEach((foldDirection) => {
    const markup = _render({
      frame: 150,
      input: { ...fixtures[2].input, foldDirection },
    });
    fixtures[2].input.receipts.forEach(({ entryId }) => {
      const receipt = markup.match(
        new RegExp(`<[^>]*data-receipt="${entryId}"[^>]*>`),
      )?.[0];
      const entry = markup.match(
        new RegExp(`<[^>]*data-journal-entry="${entryId}"[^>]*>`),
      )?.[0];
      assert.ok(receipt);
      assert.ok(entry);
      const receiptPosition = receipt.match(
        /transform="translate\(([^ ]+) ([^)]+)\)"/,
      );
      const entryPosition = entry.match(
        /transform="translate\(([^ ]+) ([^)]+)\)"/,
      );
      assert.ok(receiptPosition);
      assert.ok(entryPosition);
      assert.equal(
        Number(receiptPosition[1]),
        Number(receipt.match(/data-target-x="([^"]+)"/)?.[1]),
      );
      assert.equal(
        Number(receiptPosition[2]),
        Number(receipt.match(/data-target-y="([^"]+)"/)?.[1]),
      );
      const matchingAxis = foldDirection === "horizontal" ? 1 : 2;
      assert.equal(receiptPosition[matchingAxis], entryPosition[matchingAxis]);
      assert.equal(
        receipt.match(/data-target-x="([^"]+)"/)?.[1],
        entry.match(/data-target-x="([^"]+)"/)?.[1],
      );
      assert.equal(
        receipt.match(/data-target-y="([^"]+)"/)?.[1],
        entry.match(/data-target-y="([^"]+)"/)?.[1],
      );
    });
  });
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { getConservativeWidthFromText } from "../../text/getConservativeWidthFromText";
import { journalReceiptsContract } from "./JournalReceipts.contract";
import { inputSchema } from "./JournalReceipts.schema";

test("the completed hold begins exactly when every dense receipt tab has settled", () => {
  const dense = fixtures.find(({ id }) => id === "dense")!.input;
  const [, action, hold] = journalReceiptsContract.metadata.motionBeats;
  assert.equal(action.endFrame + 1, hold.startFrame);
  Array.from(["horizontal", "vertical"] as const).forEach((foldDirection) => {
    const input = { ...dense, foldDirection };
    const beforeHold = _render({ frame: hold.startFrame - 1, input });
    assert.ok(
      [...beforeHold.matchAll(/data-tab-rise="([^"]+)"/g)].some(
        ([, rise]) => Number(rise) > 0,
      ),
      "The frame before the completed hold must still contain a closing tab.",
    );
    Array.from(
      {
        length: Math.max(
          0,
          Math.floor((hold.endFrame - hold.startFrame) / 1) + 1,
        ),
      },
      (_, sampleIndex) => hold.startFrame + sampleIndex * 1,
    ).forEach((frame) => {
      const markup = _render({ frame, input });
      const rises = [...markup.matchAll(/data-tab-rise="([^"]+)"/g)];
      assert.deepEqual(
        rises.map(([, rise]) => Number(rise)),
        Array(dense.entries.length).fill(0),
        `${foldDirection} frame ${frame}: completed hold contains a raised tab`,
      );
      const receipts = [
        ...markup.matchAll(/<g[^>]*data-receipt="[^"]+"[^>]*>/g),
      ];
      assert.equal(receipts.length, dense.receipts.length);
      receipts.forEach(([receipt]) => {
        const position = receipt.match(
          /transform="translate\(([^ ]+) ([^)]+)\)"/,
        );
        assert.ok(position);
        assert.deepEqual(
          position.slice(1).map(Number),
          ["x", "y"].map((axis) =>
            Number(
              receipt.match(new RegExp(`data-target-${axis}="([^"]+)"`))?.[1],
            ),
          ),
          `${foldDirection} frame ${frame}: receipt has not reached its target`,
        );
      });
    });
  });
});

registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  contract: journalReceiptsContract,
  invalidInputs,
  render: ({ frame, input }) => {
    _render({
      frame,
      input: {
        ...input,
        foldDirection:
          input.foldDirection === "horizontal" ? "vertical" : "horizontal",
      },
    });
    return _render({ frame, input });
  },
  excludedTextFields: ["id", "entryId", "foldDirection"],
  textFrames: [18, 150],
  getVisibleTexts: ({ input, frame }) => [
    input.copy.journal,
    input.copy.receiptPocket,
    input.copy.pending,
    input.copy.acknowledged,
    input.copy.example,
    input.copy[frame < 36 ? "disconnected" : "reconnected"],
    ...(frame >= 56
      ? input.entries.flatMap(({ label, id }) =>
          input.showIdentifiers ? [label, id] : [label],
        )
      : []),
    ...input.receipts.flatMap(({ label, entryId }, index) =>
      frame >= 60 + index * 12
        ? input.showIdentifiers
          ? [label, entryId]
          : [label]
        : [],
    ),
  ],
});
test("identifier and label toggles preserve the retained folds and receipt matching", () => {
  const noIdentifiers = _render({
    frame: 150,
    input: {
      ...DEFAULT_INPUT,
      showIdentifiers: false,
    },
  });
  assert.doesNotMatch(noIdentifiers, /aria-label="a"/);
  assert.match(noIdentifiers, /aria-label="Example note A"/);
  const hidden = _render({
    frame: 150,
    input: { ...DEFAULT_INPUT, showLabels: false },
  });
  assert.doesNotMatch(hidden, /<text/);
  assert.equal((hidden.match(/data-journal-entry=/g) ?? []).length, 3);
  assert.equal((hidden.match(/data-tab-rise="0"/g) ?? []).length, 2);
});

test("dense vertical receipts and their painted text remain inside the canvas throughout emergence", () => {
  const input = { ...fixtures[2].input, foldDirection: "vertical" as const };
  input.receipts.forEach(({ entryId }, receiptIndex) => {
    Array.from(
      {
        length: Math.max(
          0,
          Math.floor((80 + receiptIndex * 12 - (60 + receiptIndex * 12)) / 1) +
            1,
        ),
      },
      (_, sampleIndex) => 60 + receiptIndex * 12 + sampleIndex * 1,
    ).forEach((frame) => {
      const markup = _render({ frame, input });
      const receipt = markup.match(
        new RegExp(`<g([^>]*data-receipt="${entryId}"[^>]*)>(.*?)</g>`),
      );
      assert.ok(receipt);
      const position = receipt[1].match(
        /transform="translate\(([^ ]+) ([^)]+)\)"/,
      );
      const face = receipt[2].match(/<path d="M0 0 h([^ ]+) v([^ ]+)/);
      assert.ok(position);
      assert.ok(face);
      const x = Number(position[1]),
        y = Number(position[2]);
      if (frame === 60 + receiptIndex * 12) {
        const pocket = markup.match(/<path d="M([^ ]+) 224 h([^ ]+) v256/);
        assert.ok(pocket);
        assert.equal(x, Number(pocket[1]));
        assert.ok(x + Number(face[1]) <= Number(pocket[1]) + Number(pocket[2]));
        assert.ok(y >= 224 && y + Number(face[2]) <= 480);
      }
      assert.ok(
        x >= 0 && x + Number(face[1]) <= 960,
        `receipt ${receiptIndex} frame ${frame} right edge ${x + Number(face[1])}`,
      );
      assert.ok(y >= 0 && y + Number(face[2]) <= 600);
      const textElements = [
        ...receipt[2].matchAll(/<text([^>]*)>(.*?)<\/text>/g),
      ];
      assert.equal(textElements.length, 2);
      textElements.forEach(([, attributes, content]) => {
        const fontSize = SvgAttributes.getNumberFromMarkup({
          attributes,
          name: "font-size",
        });
        const localX = SvgAttributes.getNumberFromMarkup({
          attributes,
          name: "x",
        });
        assert.ok(x + localX >= 0);
        [...content.matchAll(/<tspan[^>]*>(.*?)<\/tspan>/g)].forEach(
          ([, text]) => {
            assert.ok(
              x + localX + getConservativeWidthFromText({ text, fontSize }) <=
                960,
              `text clipped for receipt ${receiptIndex} frame ${frame}`,
            );
          },
        );
      });
    });
  });
});
