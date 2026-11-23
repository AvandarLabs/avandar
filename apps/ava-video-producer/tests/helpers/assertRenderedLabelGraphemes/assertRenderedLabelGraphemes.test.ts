import assert from "node:assert/strict";
import test from "node:test";
import { assertRenderedLabelGraphemes } from "./assertRenderedLabelGraphemes";
import type { RenderedLabelExpectation } from "./RenderedLabelExpectation.types";

test("wrapped labels preserve decoded non-whitespace graphemes", () => {
  assertRenderedLabelGraphemes({
    markup:
      '<text aria-label="A &amp; é"><tspan>A &amp;</tspan><tspan>é</tspan></text>',
    text: "A & é",
  });
});

test("an intact accessible label cannot hide truncated painted text", () => {
  assert.throws(() => {
    assertRenderedLabelGraphemes({
      markup: '<text aria-label="Complete"><tspan>Com</tspan></text>',
      text: "Complete",
    });
  }, /lost or split authored graphemes/);
});

test("a grapheme split across tspans fails even when concatenation matches", () => {
  assert.throws(() => {
    assertRenderedLabelGraphemes({
      markup: '<text aria-label="é"><tspan>e</tspan><tspan>́</tspan></text>',
      text: "é",
    });
  }, /lost or split authored graphemes/);
});

test("entity-looking authored text is decoded only once", () => {
  assertRenderedLabelGraphemes({
    markup: '<text aria-label="&amp;amp;"><tspan>&amp;amp;</tspan></text>',
    text: "&amp;",
  });
});

test("literal metadata preserves exact visible whitespace markers", () => {
  assertRenderedLabelGraphemes({
    markup:
      '<text aria-label="A B" data-literal-value="A B"><tspan>A</tspan><tspan>·</tspan><tspan>B</tspan></text>',
    text: "A B",
  });
});

test("ordinary labels cannot insert visible whitespace markers", () => {
  assert.throws(() => {
    assertRenderedLabelGraphemes({
      markup: '<text aria-label="A B"><tspan>A·B</tspan></text>',
      text: "A B",
    });
  }, /lost or split authored graphemes/);
});

test("literal metadata cannot hide missing or incorrect whitespace marks", () => {
  ["AB", "A⇥B"].forEach((painted) => {
    assert.throws(() => {
      assertRenderedLabelGraphemes({
        markup: `<text aria-label="A B" data-literal-value="A B"><tspan>${painted}</tspan></text>`,
        text: "A B",
      });
    }, /lost or split authored graphemes/);
  });
});

test("wrapped literal metadata retains every authored line and marked space", () => {
  assertRenderedLabelGraphemes({
    markup:
      '<g aria-label="Aé B" data-raw-grid-value="Aé B"><text aria-label="Aé" data-literal-value="Aé"><tspan>A</tspan><tspan>é</tspan></text><text aria-label=" B" data-literal-value=" B"><tspan>·</tspan><tspan>B</tspan></text></g>',
    text: "Aé B",
  });
});

test("wrapped literal metadata rejects truncation and cluster splits", () => {
  [
    '<g aria-label="éB" data-raw-grid-value="éB"><text aria-label="e" data-literal-value="e"><tspan>e</tspan></text><text aria-label="́B" data-literal-value="́B"><tspan>́</tspan><tspan>B</tspan></text></g>',
    '<g aria-label="éB" data-raw-grid-value="éB"><text aria-label="éB" data-literal-value="éB"><tspan>é</tspan></text></g>',
  ].forEach((markup) => {
    assert.throws(() => {
      assertRenderedLabelGraphemes({ markup, text: "éB" });
    }, /lost or split authored graphemes/);
  });
});

const DISTANCE_LABEL = {
  text: "↔ 0 é",
  representation: {
    kind: "distance-arrow",
    paintedText: "0 é",
    path: "M192 206 H204 M195 203 L192 206 L195 209 M201 203 L204 206 L201 209",
  },
} satisfies Exclude<RenderedLabelExpectation, string>;
const DISTANCE_MARKUP = `<g aria-label="↔ 0 é"><path d="${DISTANCE_LABEL.representation.path}" stroke="#fff"></path><text aria-label="0 é"><tspan>0 é</tspan></text></g>`;

test("an explicit distance label verifies drawn arrow and complete unit text", () => {
  assertRenderedLabelGraphemes({
    markup: DISTANCE_MARKUP,
    text: DISTANCE_LABEL,
  });
});

test("a distance label cannot hide absent, wrong or invisible arrow paint", () => {
  [
    DISTANCE_MARKUP.replace(/<path[^>]*><\/path>/, ""),
    DISTANCE_MARKUP.replace("H204", "H200"),
    DISTANCE_MARKUP.replace('stroke="#fff"', 'stroke="none"'),
    DISTANCE_MARKUP.replace('stroke="#fff"', 'stroke="#fff" opacity="0"'),
  ].forEach((markup) => {
    assert.throws(() => {
      assertRenderedLabelGraphemes({ markup, text: DISTANCE_LABEL });
    }, /lost or split authored graphemes/);
  });
});

test("a complete distance aria label cannot hide missing or split unit text", () => {
  [
    DISTANCE_MARKUP.replace("<tspan>0 é</tspan>", "<tspan>0</tspan>"),
    DISTANCE_MARKUP.replace(
      "<tspan>0 é</tspan>",
      "<tspan>0 e</tspan><tspan>́</tspan>",
    ),
  ].forEach((markup) => {
    assert.throws(() => {
      assertRenderedLabelGraphemes({ markup, text: DISTANCE_LABEL });
    }, /lost or split authored graphemes/);
  });
});

test("literal metadata must agree with authored accessible text", () => {
  assert.throws(() => {
    assertRenderedLabelGraphemes({
      markup:
        '<text aria-label="AB" data-literal-value="OTHER"><tspan>AB</tspan></text>',
      text: "AB",
    });
  }, /lost or split authored graphemes/);
});

test("explicit ASCII whitespace labels preserve each marked control", () => {
  const text = "A B\tC\nD\rE";
  assertRenderedLabelGraphemes({
    markup: `<text aria-label="${text}">A·B⇥C↵D␍E</text>`,
    text: { text, representation: { kind: "ascii-whitespace" } },
  });
});

test("ordinary labels reject the same marked controls without a declaration", () => {
  const text = "A B\tC\nD\rE";
  assert.throws(() => {
    assertRenderedLabelGraphemes({
      markup: `<text aria-label="${text}">A·B⇥C↵D␍E</text>`,
      text,
    });
  }, /lost or split authored graphemes/);
});

test("explicit ASCII whitespace labels reject missing or mutated marks", () => {
  ["AB", "A⇥B", "A·"].forEach((painted) => {
    assert.throws(() => {
      assertRenderedLabelGraphemes({
        markup: `<text aria-label="A B">${painted}</text>`,
        text: { text: "A B", representation: { kind: "ascii-whitespace" } },
      });
    }, /lost or split authored graphemes/);
  });
});

test("explicit ASCII whitespace labels retain non-ASCII spacing unchanged", () => {
  const text = "A\u00a0B\u2003C";
  assertRenderedLabelGraphemes({
    markup: `<text aria-label="${text}">${text}</text>`,
    text: { text, representation: { kind: "ascii-whitespace" } },
  });
  ["AB\u2003C", "A␣B␣C"].forEach((painted) => {
    assert.throws(() => {
      assertRenderedLabelGraphemes({
        markup: `<text aria-label="${text}">${painted}</text>`,
        text: { text, representation: { kind: "ascii-whitespace" } },
      });
    }, /lost or split authored graphemes/);
  });
});

test("explicit ASCII whitespace labels retain complete grapheme boundaries", () => {
  assertRenderedLabelGraphemes({
    markup: '<text aria-label="é 👩‍🔬"><tspan>é·👩‍🔬</tspan></text>',
    text: { text: "é 👩‍🔬", representation: { kind: "ascii-whitespace" } },
  });
  assert.throws(() => {
    assertRenderedLabelGraphemes({
      markup:
        '<text aria-label="é 👩‍🔬"><tspan>e</tspan><tspan>́·👩‍🔬</tspan></text>',
      text: { text: "é 👩‍🔬", representation: { kind: "ascii-whitespace" } },
    });
  }, /lost or split authored graphemes/);
});

const SOURCE_GLYPH_LABEL = {
  text: "é 👩‍🔬 ",
  representation: { kind: "source-glyph-run" },
} satisfies Exclude<RenderedLabelExpectation, string>;
const SOURCE_GLYPH_MARKUP =
  '<g aria-label="é 👩‍🔬 " data-source-glyph-run="true"><g><text fill="#fff" font-size="16">é</text></g><g><text fill="#fff" font-size="16"> </text></g><g><text fill="#fff" font-size="16">👩‍🔬</text></g><g><text fill="#fff" font-size="16"> </text></g></g>';

test("explicit source glyph runs retain complete copy and whole painted clusters", () => {
  assertRenderedLabelGraphemes({
    markup: SOURCE_GLYPH_MARKUP,
    text: SOURCE_GLYPH_LABEL,
  });
});

test("source glyph runs require exact accessibility and dedicated renderer metadata", () => {
  [
    SOURCE_GLYPH_MARKUP.replace(' data-source-glyph-run="true"', ""),
    SOURCE_GLYPH_MARKUP.replace('aria-label="é 👩‍🔬 "', 'aria-label="é 👩‍🔬"'),
  ].forEach((markup) => {
    assert.throws(() => {
      assertRenderedLabelGraphemes({ markup, text: SOURCE_GLYPH_LABEL });
    }, /Missing rendered label|lost or split authored graphemes/);
  });
});

test("source glyph runs reject truncation duplication reordering and cluster splits", () => {
  [
    SOURCE_GLYPH_MARKUP.replace("👩‍🔬</text>", "</text>"),
    SOURCE_GLYPH_MARKUP.replace("👩‍🔬</text>", "👩‍🔬👩‍🔬</text>"),
    SOURCE_GLYPH_MARKUP.replace("é</text>", "👩‍🔬</text>"),
    SOURCE_GLYPH_MARKUP.replace("é</text>", "e</text><text>́</text>"),
  ].forEach((markup) => {
    assert.throws(() => {
      assertRenderedLabelGraphemes({ markup, text: SOURCE_GLYPH_LABEL });
    }, /lost or split authored graphemes/);
  });
});

test("source glyph runs reject hidden transparent and zero-sized paint", () => {
  [
    SOURCE_GLYPH_MARKUP.replace('fill="#fff"', 'fill="none"'),
    SOURCE_GLYPH_MARKUP.replace('fill="#fff"', 'fill="transparent"'),
    SOURCE_GLYPH_MARKUP.replace('font-size="16"', 'font-size="0"'),
    SOURCE_GLYPH_MARKUP.replace("<g><text", '<g opacity="0"><text'),
  ].forEach((markup) => {
    assert.throws(() => {
      assertRenderedLabelGraphemes({ markup, text: SOURCE_GLYPH_LABEL });
    }, /lost or split authored graphemes/);
  });
});

test("source glyph visibility ignores hidden decorative siblings", () => {
  assertRenderedLabelGraphemes({
    markup: SOURCE_GLYPH_MARKUP.replace(
      "</g>",
      '<path opacity="0" d="M0 0 H2"></path></g>',
    ),
    text: SOURCE_GLYPH_LABEL,
  });
});

test("source glyph runs reject inherited and inline invisible text paint", () => {
  [
    SOURCE_GLYPH_MARKUP.replace(
      "<g aria-label",
      '<g fill-opacity="0" aria-label',
    ),
    SOURCE_GLYPH_MARKUP.replace('fill="#fff"', 'fill="#fff" fill-opacity="0"'),
    SOURCE_GLYPH_MARKUP.replace('fill="#fff"', 'fill="#fff" style="fill:none"'),
    SOURCE_GLYPH_MARKUP.replace(
      'fill="#fff"',
      'fill="#fff" style="fill:transparent"',
    ),
    SOURCE_GLYPH_MARKUP.replace(
      'fill="#fff"',
      'fill="#fff" style="font-size:0px"',
    ),
    SOURCE_GLYPH_MARKUP.replace(
      'fill="#fff"',
      'fill="#fff" style="fill-opacity:0"',
    ),
  ].forEach((markup) => {
    assert.throws(() => {
      assertRenderedLabelGraphemes({ markup, text: SOURCE_GLYPH_LABEL });
    }, /lost or split authored graphemes/);
  });
});

test("source glyph paint overrides inherited fill opacity when explicitly visible", () => {
  assertRenderedLabelGraphemes({
    markup: SOURCE_GLYPH_MARKUP.replace(
      "<g aria-label",
      '<g fill-opacity="0" aria-label',
    ).replaceAll("<text fill=", '<text fill-opacity="1" fill='),
    text: SOURCE_GLYPH_LABEL,
  });
});

test("filled source glyphs remain visible with zero ancestor stroke opacity", () => {
  assertRenderedLabelGraphemes({
    markup: SOURCE_GLYPH_MARKUP.replace(
      "<g aria-label",
      '<g stroke-opacity="0" aria-label',
    ),
    text: SOURCE_GLYPH_LABEL,
  });
});

test("source glyph inline styles override same-node presentation attributes", () => {
  [
    'opacity="0" style="opacity:1"',
    'display="none" style="display:inline"',
    'visibility="hidden" style="visibility:visible"',
  ].forEach((attributes) => {
    assertRenderedLabelGraphemes({
      markup: SOURCE_GLYPH_MARKUP.replace(
        "<text fill=",
        `<text ${attributes} fill=`,
      ),
      text: SOURCE_GLYPH_LABEL,
    });
  });
});

test("explicit source glyph visibility restores an inherited hidden value", () => {
  assertRenderedLabelGraphemes({
    markup: SOURCE_GLYPH_MARKUP.replace(
      "<g aria-label",
      '<g visibility="hidden" aria-label',
    ).replaceAll("<text fill=", '<text visibility="visible" fill='),
    text: SOURCE_GLYPH_LABEL,
  });
});

test("source glyph children cannot restore ancestor opacity or display hiding", () => {
  [
    SOURCE_GLYPH_MARKUP.replace(
      "<g aria-label",
      '<g opacity="0" aria-label',
    ).replaceAll("<text fill=", '<text opacity="1" fill='),
    SOURCE_GLYPH_MARKUP.replace(
      "<g aria-label",
      '<g display="none" aria-label',
    ).replaceAll("<text fill=", '<text display="inline" fill='),
  ].forEach((markup) => {
    assert.throws(() => {
      assertRenderedLabelGraphemes({ markup, text: SOURCE_GLYPH_LABEL });
    }, /lost or split authored graphemes/);
  });
});

test("source glyph inline hiding and inherited hidden visibility reject paint", () => {
  [
    SOURCE_GLYPH_MARKUP.replace(
      "<text fill=",
      '<text opacity="1" style="opacity:0" fill=',
    ),
    SOURCE_GLYPH_MARKUP.replace(
      "<text fill=",
      '<text display="inline" style="display:none" fill=',
    ),
    SOURCE_GLYPH_MARKUP.replace(
      "<text fill=",
      '<text visibility="visible" style="visibility:hidden" fill=',
    ),
    SOURCE_GLYPH_MARKUP.replace(
      "<g aria-label",
      '<g visibility="hidden" aria-label',
    ),
  ].forEach((markup) => {
    assert.throws(() => {
      assertRenderedLabelGraphemes({ markup, text: SOURCE_GLYPH_LABEL });
    }, /lost or split authored graphemes/);
  });
});
