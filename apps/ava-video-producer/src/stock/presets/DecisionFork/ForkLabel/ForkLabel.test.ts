import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getConservativeWidthFromText } from "../../../text/getConservativeWidthFromText";
import { DecisionFork } from "../DecisionFork";
import { DECISION_FORK_DENSE_INPUT } from "../DecisionFork.fixtures";
import { ForkLabel } from "./ForkLabel";
function _lines({
  text,
  width = 168,
  size = 17,
}: {
  text: string;
  width?: number;
  size?: number;
}): string[] {
  const markup = renderToStaticMarkup(
    createElement(ForkLabel, {
      text,
      x: 0,
      y: 0,
      width,
      size,
    }),
  );
  return [...markup.matchAll(/<text\b[^>]*>(.*?)<\/text>/g)].map((match) =>
    match[1].replace(/&amp;/g, "&").replace(/&#x27;/g, "'"),
  );
}
test("ordinary authored words wrap at pixel bounds without splitting fitting tokens", () => {
  [
    "Needs review",
    "Ready for release",
    "Send to reviewer",
    "Publish approved work",
  ].forEach((text) => {
    const lines = _lines({ text });
    assert.equal(lines.join(""), text);
    text.split(" ").forEach((word) =>
      assert.ok(
        lines.some((line) => line.includes(word)),
        `${text}: ${word}`,
      ),
    );
    lines.forEach((line) =>
      assert.ok(
        getConservativeWidthFromText({
          text: line,
          fontSize: 17,
        }) <= 168,
      ),
    );
  });
});
test("a question fits the wider heading slot with its punctuation attached", () => {
  assert.deepEqual(
    _lines({ text: "Which path fits this request?", width: 800, size: 24 }),
    ["Which path fits this request?"],
  );
  assert.deepEqual(
    _lines({ text: "Review, approve & publish!", width: 800, size: 24 }),
    ["Review, approve & publish!"],
  );
});
test("maximum wide glyphs wrap without loss at fixed sizes inside branch and heading bounds", () => {
  [
    {
      text: "W".repeat(24),
      width: 168,
      size: 17,
      maxLines: 3,
    },
    {
      text: `${"W".repeat(10)} ${"W".repeat(10)} WW`,
      width: 168,
      size: 17,
      maxLines: 3,
    },
    {
      text: "界".repeat(24),
      width: 184,
      size: 17,
      maxLines: 3,
    },
    {
      text: "W".repeat(52),
      width: 800,
      size: 24,
      maxLines: 2,
    },
  ].forEach(({ text, width, size, maxLines }) => {
    const lines = _lines({ text, width, size });
    assert.equal(lines.join(""), text);
    assert.ok(lines.length <= maxLines);
    lines.forEach((line) =>
      assert.ok(
        getConservativeWidthFromText({
          text: line,
          fontSize: size,
        }) <= width,
      ),
    );
  });
});
test("two and four branches keep complete labels under deterministic out-of-order seeking", () => {
  [2, 4].forEach((numBranches) => {
    const input = {
      ...DECISION_FORK_DENSE_INPUT,
      prompt: "Which path fits this request?",
      branches: DECISION_FORK_DENSE_INPUT.branches
        .slice(0, numBranches)
        .map((branch, index) => ({
          ...branch,
          condition: index ? "Ready for release" : "Needs review",
          outcome: index ? "Publish approved work" : "Send to reviewer",
        })),
    };
    const render = ({ frame }: Readonly<{ frame: number }>) =>
      renderToStaticMarkup(
        createElement(DecisionFork, {
          frame,
          input,
          accent: "#51a7ff",
          background: "#0b1219",
          id: "test",
        }),
      );
    const samples = [0, 18, 36, 90, 150, 179].map((frame) => ({
      frame,
      markup: render({ frame: frame }),
    }));
    [...samples]
      .reverse()
      .forEach(({ frame, markup }) =>
        assert.equal(render({ frame: frame }), markup),
      );
    assert.equal(
      (render({ frame: 150 }).match(/data-branch=/g) ?? []).length,
      numBranches,
    );
    assert.match(render({ frame: 150 }), /Publish approved/);
    assert.doesNotMatch(render({ frame: 150 }), />proved wor</);
  });
});

[`${"界".repeat(8)}é`, `${"界".repeat(7)}👩‍🔬`].forEach((text) => {
  test(`wrapping keeps the original grapheme in ${text}`, () => {
    const lines = _lines({ text });
    assert.equal(lines.join(""), text);
    assert.ok(
      lines.some((line) =>
        line.includes(text.endsWith("e\u0301") ? "e\u0301" : "👩‍🔬"),
      ),
    );
    assert.ok(lines.every((line) => !/^[\p{Mark}\u200d]/u.test(line)));
  });
});
