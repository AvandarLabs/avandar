/** SVG attribute bounds estimates must reject known escaped canvas content. */
import assert from "node:assert/strict";
import test from "node:test";
import { propEq } from "@avandar/utils";
import { SvgPaintAssertions } from "../SvgPaintAssertions/SvgPaintAssertions";

test("visible text outside the canvas fails the estimate", () => {
  assert.throws(
    () =>
      SvgPaintAssertions.assertTextCanvasBounds({
        markup: '<g><text x="950" y="50" font-size="20">WWW</text></g>',
      }),
    /outside/,
  );
});

test("nested transforms and multiline anchors accumulate actual baselines", () => {
  const markup =
    '<g transform="translate(100 100) scale(2)"><g transform="translate(20 5)"><text x="20" y="10" font-size="12" text-anchor="middle"><tspan x="20" dy="0">AB</tspan><tspan x="20" dy="15">CD</tspan></text></g></g>';
  assert.doesNotThrow(() =>
    SvgPaintAssertions.assertTextCanvasBounds({
      markup,
      width: 220,
      height: 170,
    }),
  );
  assert.throws(
    () =>
      SvgPaintAssertions.assertTextCanvasBounds({
        markup,
        width: 220,
        height: 160,
      }),
    /outside/,
  );
  assert.throws(
    () =>
      SvgPaintAssertions.assertTextCanvasBounds({
        markup,
        width: 190,
        height: 170,
      }),
    /outside/,
  );
});
test("inert definitions and zero-opacity content do not create false bounds", () => {
  const markup =
    '<svg><defs><text x="9999" transform="rotate(50)">hidden</text></defs><g opacity="0"><text x="9999">hidden</text></g><text x="5" y="20" font-size="12">visible</text></svg>';
  assert.doesNotThrow(() =>
    SvgPaintAssertions.assertTextCanvasBounds({ markup }),
  );
});
test("entities decode once and combining sequences stay whole", () => {
  assert.doesNotThrow(() =>
    SvgPaintAssertions.assertTextCanvasBounds({
      markup: '<text x="0" y="12" font-size="12">e&#x301;&amp;&#38;&lt;</text>',
      width: 60,
      height: 16,
    }),
  );
  assert.throws(
    () =>
      SvgPaintAssertions.assertTextCanvasBounds({
        markup: '<text x="0" y="12" font-size="12">&amp;lt;</text>',
        width: 20,
        height: 16,
      }),
    /outside/,
  );
});
test("unsupported relevant transforms and layout fail explicitly", () => {
  [
    'transform="rotate(20)"',
    'style="font-size:12px"',
    'textLength="20"',
    'x="2 10"',
    'clip-path="url(#clip)"',
  ].forEach((attribute) =>
    assert.throws(
      () =>
        SvgPaintAssertions.assertTextCanvasBounds({
          markup: `<text ${attribute} y="20">word</text>`,
        }),
      /Unsupported/,
    ),
  );
});
test("visible inherited opacity and negative scales still enforce both sides", () => {
  assert.throws(
    () =>
      SvgPaintAssertions.assertTextCanvasBounds({
        markup:
          '<g opacity="0.001" transform="translate(10 30) scale(-1 1)"><text font-size="12">XX</text></g>',
      }),
    /outside/,
  );
});
test("indirect text, foreign layout and unmodeled SVG viewports fail explicitly", () => {
  [
    '<use href="#label"/>',
    "<foreignObject><div>label</div></foreignObject>",
    '<text><textPath href="#curve">label</textPath></text>',
    '<svg viewBox="0 0 20 20"><text>label</text></svg>',
  ].forEach((markup) =>
    assert.throws(
      () => SvgPaintAssertions.assertTextCanvasBounds({ markup }),
      /Unsupported/,
    ),
  );
  assert.doesNotThrow(() =>
    SvgPaintAssertions.assertTextCanvasBounds({
      markup: '<text x="1" y="12" font-size="12">&#X41;</text>',
      width: 20,
      height: 16,
    }),
  );
});

test("anchored continuation chunks fail explicitly instead of certifying off-canvas text", () => {
  ["middle", "end"].forEach((anchor) => {
    assert.throws(
      () =>
        SvgPaintAssertions.assertTextCanvasBounds({
          markup: `<text x="20" y="20" font-size="12" text-anchor="${anchor}">A<tspan>A</tspan><tspan>A</tspan><tspan>A</tspan><tspan>A</tspan><tspan>A</tspan></text>`,
        }),
      /Unsupported anchored continuation/,
    );
  });
});

test("ordinary Arial labels fit the reserved right-side slots", () => {
  [
    '<text x="720" y="112" font-size="12">Transferred volume</text>',
    '<text x="650" y="145" font-size="14">Fictional situation A</text>',
    '<text x="665" y="494" font-size="12">Returned acknowledgements</text>',
  ].forEach((markup) =>
    assert.doesNotThrow(() =>
      SvgPaintAssertions.assertTextCanvasBounds({ markup }),
    ),
  );
});

test("wide ASCII and lowercase keep their reviewed advance boundaries", () => {
  [
    [12, 25, 42],
    [14, 29, 48],
    [16, 33, 56],
    [18, 36, 64],
    [20, 40, 68],
    [24, 48, 82],
    [28, 56, 94],
    [32, 64, 108],
  ].forEach(([fontSize, wideWidth, lowerWidth]) => {
    [
      ["W@", wideWidth],
      ["mmww", lowerWidth],
    ].forEach(([text, width]) => {
      const markup = `<text x="0" y="${fontSize}" font-size="${fontSize}">${text}</text>`;
      assert.doesNotThrow(() =>
        SvgPaintAssertions.assertTextCanvasBounds({
          markup,
          width: Number(width),
          height: fontSize * 2,
        }),
      );
      assert.throws(
        () =>
          SvgPaintAssertions.assertTextCanvasBounds({
            markup,
            width: Number(width) - 1,
            height: fontSize * 2,
          }),
        /outside/,
      );
    });
  });
});

test("long full-width labels and whole graphemes fit their authored slots", () => {
  [
    `<text x="50" y="45" font-size="16">${"W".repeat(53)}</text>`,
    '<text x="795" y="478" font-size="12">Returned acknowl</text>',
    `<text x="840" y="445" font-size="12">${"界".repeat(8)}</text>`,
    '<text x="900" y="20" font-size="12">e&#x301;👩‍🔬</text>',
  ].forEach((markup) =>
    assert.doesNotThrow(() =>
      SvgPaintAssertions.assertTextCanvasBounds({ markup }),
    ),
  );
  assert.throws(
    () =>
      SvgPaintAssertions.assertTextCanvasBounds({
        markup: '<text x="950" y="20" font-size="12">👩‍🔬</text>',
      }),
    /outside/,
  );
});

test("text-free rotation clips and masks do not constrain unrelated sibling text", () => {
  assert.doesNotThrow(() =>
    SvgPaintAssertions.assertTextCanvasBounds({
      markup:
        '<svg><g transform="rotate(20)" clip-path="url(#a)" mask="url(#b)"><g><path d="M0 0 H50"/></g></g><text x="20" y="30">Visible</text></svg>',
    }),
  );
});
test("unsupported geometry attributes still reject explicit and indirect text descendants", () => {
  ['transform="rotate(20)"', 'clip-path="url(#a)"', 'mask="url(#b)"'].forEach(
    (attribute) => {
      [
        '<text x="20" y="30">Visible</text>',
        '<use href="#text"/>',
        "<foreignObject/>",
        "<textPath/>",
      ].forEach((child) => {
        assert.throws(() =>
          SvgPaintAssertions.assertTextCanvasBounds({
            markup: `<svg><g ${attribute}><g>${child}</g></g></svg>`,
          }),
        );
      });
    },
  );
});
test("geometry-only skipping preserves markup balance and later sibling bounds", () => {
  assert.throws(
    () =>
      SvgPaintAssertions.assertTextCanvasBounds({
        markup: '<svg><g transform="rotate(20)"><path/></svg>',
      }),
    /Unbalanced/,
  );
  assert.throws(
    () =>
      SvgPaintAssertions.assertTextCanvasBounds({
        markup:
          '<svg><g transform="rotate(20)"><path/></g><text x="960" y="30">outside</text></svg>',
      }),
    /outside canvas/,
  );
  assert.doesNotThrow(() =>
    SvgPaintAssertions.assertTextCanvasBounds({
      markup:
        '<svg><g transform="rotate(20)"><defs><text x="-100" y="-100">inert</text></defs><path/></g><text x="20" y="30">Visible</text></svg>',
    }),
  );
});

test("paint envelopes retain actual transformed text, rectangle fills and foreground order", () => {
  const markup =
    '<g opacity="0.5" transform="translate(10 20) scale(2)"><rect x="1" y="2" width="30" height="10" fill="red" fill-opacity="0.4"/><text aria-label="AB" x="2" y="12" font-size="12">AB</text><rect x="2" y="0" width="12" height="20" fill="blue"/></g>';
  const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(markup);
  assert.equal(paint.length, 3);
  const [earlier, text, later] = paint;
  assert.equal(text.kind, "text");
  assert.equal(text.text, "AB");
  assert.equal(text.ariaLabel, "AB");
  assert.equal(text.left, 14);
  assert.equal(text.top, 20);
  assert.equal(text.opacity, 0.5);
  assert.equal(earlier.fill, "red");
  assert.equal(earlier.fillOpacity, 0.4);
  assert.equal(earlier.left, 12);
  assert.equal(earlier.bottom, 44);
  assert.ok(
    earlier.paintIndex < text.paintIndex && text.paintIndex < later.paintIndex,
  );
});
test("hidden paint stays absent while transparent and unfilled rectangles retain explicit facts", () => {
  const markup =
    '<g opacity="0"><text x="9999">hidden</text><rect width="9999" height="9999"/></g><defs><rect width="9999" height="9999"/></defs><rect width="10" height="10" fill="none"/><rect width="10" height="10" fill="red" fill-opacity="0"/><text x="1" y="12" font-size="12">visible</text>';
  const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(markup);
  assert.equal(paint.length, 3);
  assert.equal(paint[0].fill, "none");
  assert.equal(paint[1].fillOpacity, 0);
  assert.equal(paint[2].text, "visible");
});
test("paint extraction preserves existing unsupported visible-text guards", () => {
  assert.throws(
    () =>
      SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(
        '<text transform="rotate(2)">unsupported</text>',
      ),
    /Unsupported/,
  );
  const markup =
    '<text x="20" y="30" font-size="12"><tspan x="20">First</tspan><tspan x="20" dy="16">Second</tspan></text>';
  const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(markup);
  assert.equal(paint.length, 2);
  assert.equal(paint[1].top, 34);
  assert.doesNotThrow(() =>
    SvgPaintAssertions.assertTextCanvasBounds({ markup }),
  );
});

test("paint clearance distinguishes earlier backgrounds, later foregrounds and text overprint", () => {
  const check = (markup: string) => {
    const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(markup);
    SvgPaintAssertions.assertPaintClearance({
      texts: paint.filter(propEq("kind", "text")),
      rectangles: paint.filter(
        (item) =>
          item.kind === "rect" && item.fill !== "none" && item.fillOpacity > 0,
      ),
    });
  };
  const text = '<text x="10" y="25" font-size="12">Visible</text>',
    rectangle = '<rect x="5" y="5" width="100" height="30" fill="red"/>';
  assert.doesNotThrow(() => check(`${rectangle}${text}`));
  assert.throws(() => check(`${text}${rectangle}`), /Foreground/);
  assert.throws(() => check(`${text}${text}`), /overprint/i);
  assert.doesNotThrow(() =>
    check(
      `${text}<rect x="5" y="5" width="100" height="30" fill="none"/><rect x="5" y="5" width="100" height="30" fill-opacity="0"/>`,
    ),
  );
});
