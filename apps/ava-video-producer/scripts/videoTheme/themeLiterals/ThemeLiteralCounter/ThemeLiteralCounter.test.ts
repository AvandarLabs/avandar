import assert from "node:assert/strict";
import test from "node:test";
import { ThemeLiteralCounter } from "./ThemeLiteralCounter";

function _count({
  source,
  fileName = "Shape.tsx",
}: Readonly<{ source: string; fileName?: string }>) {
  return ThemeLiteralCounter.countThemeLiteralsFromSource({ fileName, source });
}
test("palette reads, hex strings, and colour functions count as colour", () => {
  const counts = _count({
    source: `
    const a = STOCK.mint;
    const b = "#9fefca";
    const c = \`rgba(0, 0, 0, \${alpha})\`;
    const d = <rect fill="white" />;
  `,
  });
  assert.equal(counts.colour, 4);
});
test("comments and imports never count", () => {
  const counts = _count({
    source: `
    import { STAGGER, EASE } from "../../motion";
    // const a = STOCK.mint; strokeWidth={3}
    /* "#ffffff" */
    export const value = 1;
  `,
  });
  assert.equal(ThemeLiteralCounter.sumThemeLiteralCounts(counts), 0);
});
test("a ramp with a literal duration and no curve counts twice", () => {
  const counts = _count({
    source: `
    const t = ramp(frame, 40, 12);
    const u = ramp(frame, 40, motion.panel, motion.entrance.easing);
    const v = enter(frame, 10, { dur: 9, y: 12 });
    const w = EASE.inOut(t) + DUR.panel + STAGGER;
  `,
  });
  assert.deepEqual([counts.motion, counts.implicitEasing], [6, 1]);
});
test("a themed helper's literal duration counts unless scale wraps it", () => {
  const counts = _count({
    source: `
    const a = motion.ramp(frame, 10, 18);
    const b = motion.ramp(frame, 10, motion.scale(18));
    const c = motion.count(frame, 4, total, 30);
    const d = motion.pop(frame, 4, 48 - index * 3);
    const e = motion.ramp(frame, 4, ordinal === 0 ? 4 : 3);
    const f = motion.enter(frame, 4, { dur: 9 });
    const g = motion.ramp(frame, 4, motion.panel);
    const h = motion.ramp(frame, 88, 92 - 88);
    const i = motion.ramp(frame, reviewAt + 8, returnAt - reviewAt - 8);
    const j = motion.ramp(frame, at, duration * 0.4);
  `,
  });
  assert.deepEqual([counts.motion, counts.implicitEasing], [5, 0]);
});
test("a per-item stagger counts unless scaleStagger wraps it", () => {
  const counts = _count({
    source: `
    const a = motion.ramp(frame, 12 + index * 6, motion.panel);
    const b = motion.enter(frame, base + row.order * 4);
    const c = motion.ramp(frame, 12 + index * motion.scaleStagger(6), motion.panel);
    const d = motion.reveal(frame, at + index);
    const e = motion.ramp(frame, at + duration * 0.55, duration * 0.45);
  `,
  });
  assert.equal(counts.motion, 2);
});
test("string, negative, and conditional literals count like numbers", () => {
  const counts = _count({
    source: `
    <g>
      <rect strokeWidth="2" opacity="0.5" rx={-3} stopOpacity={0.3} />
      <rect opacity={isFaded ? 0.4 : 1} strokeWidth={isBold ? 2 : 1} />
      <text fontSize={isLarge ? 18 : 14} fill="red" />
      <rect fill="none" stroke="currentColor" opacity={isShown ? 1 : 0} />
    </g>
  `,
  });
  assert.deepEqual([counts.line, counts.type, counts.colour], [7, 2, 1]);
});
test("inline transitions and blurs written as strings count", () => {
  const counts = _count({
    source: `
    const a = { transition: "opacity 300ms", filter: "blur(4px)" };
    const b = { transition: transitionFromTheme, filter: \`blur(\${radius}px)\` };
  `,
  });
  assert.deepEqual([counts.motion, counts.line], [1, 1]);
});
test("inline spacing with a length counts, and zero does not", () => {
  const counts = _count({
    source: `
    const a = { padding: 28, gap: "0 20px", margin: 0, marginTop: spacing.md };
    const b = { padding: \`\${spacing.xs} 12px\`, paddingTop: "0" };
  `,
  });
  assert.equal(counts.spacing, 3);
});
test("numeric line attributes and decimal opacities count as line", () => {
  const counts = _count({
    source: `
    <rect rx={8} strokeWidth={3} opacity={0.5} fillOpacity={1}
      strokeDasharray="4 4" stroke="none" />
  `,
  });
  assert.deepEqual([counts.line, counts.sketch], [4, 0]);
});
test("stroked raw shapes count as sketch bypass", () => {
  const counts = _count({
    source: `
    <g>
      <circle r={4} stroke={color} />
      <StockRect stroke={color} />
      <path d="M0 0" stroke="none" />
    </g>
  `,
  });
  assert.equal(counts.sketch, 1);
});
test("text sizes count on Text and raw text, never on FitText or a fitted size", () => {
  const counts = _count({
    source: `
    <g>
      <Text size={18} />
      <Text size="29" fittedSize={137} />
      <text fontSize={14} fontFamily="Arial, sans-serif" />
      <FitText fontSize={16} />
    </g>
  `,
  });
  assert.equal(counts.type, 3);
});
test("starter palette names count apart from colour", () => {
  const counts = _count({
    source: `const style = { color: "var(--brand)", borderRadius: "var(--radius)" };`,
  });
  assert.deepEqual([counts.starter, counts.colour], [2, 0]);
});
test("stylesheet values count unless they read a variable", () => {
  const counts = _count({
    source: `.a { color: #fff; font-size: var(--size); border-radius: 4px; }`,
    fileName: "Shape.module.css",
  });
  assert.equal(counts.css, 3);
});
test("stage geometry lengths are structural but spacing and variable radii are judged apart", () => {
  const counts = _count({
    source: `.a { width: 640px; top: 73px; grid-template-columns: 360px 1fr; gap: 24px; border-radius: var(--r); }`,
    fileName: "Stage.module.css",
  });
  assert.equal(counts.css, 1);
});
test("the chrome token sheet declares the chrome scale, so only that exact path is skipped", () => {
  const sheet = `:root { --atlas-space-12: 12px; --atlas-color-white: #fff; }`;
  assert.equal(
    _count({ source: sheet, fileName: "showcase/chrome-tokens.css" }).css,
    0,
  );
  assert.equal(
    _count({ source: sheet, fileName: "showcase/motion.css" }).css,
    2,
  );
  assert.equal(
    _count({ source: sheet, fileName: "src/gallery/chrome-tokens.css" }).css,
    2,
  );
});
test("transitions and animations count only when a timing literal remains outside variables", () => {
  const counts = _count({
    source: `.a { transition: opacity var(--fast), transform var(--fast); }
     .b { transition: none !important; animation: none !important; }
     .c { transition: opacity 0.15s; }
     .d { transition: color var(--fast) ease-in-out; }
     .e { animation: spin 300ms linear infinite; }
     .f { transition-timing-function: cubic-bezier(0.2, 0, 0, 1); }`,
    fileName: "Shape.module.css",
  });
  assert.equal(counts.css, 5);
});
test("stylesheet tracking, named colours, and decimal opacities count", () => {
  const counts = _count({
    source: `.a { letter-spacing: -0.02em; color: white; opacity: 0.6; }
     .b { letter-spacing: var(--atlas-tracking); color: var(--x); opacity: 1; }
     .c { letter-spacing: 0; }`,
    fileName: "Shape.module.css",
  });
  assert.equal(counts.css, 3);
});
test("CSS-wide keywords never count as font literals", () => {
  const counts = _count({
    source: `.a { font-family: inherit; font-size: inherit; font-weight: unset; }
     .b { font-family: Georgia, serif; }`,
    fileName: "Shape.module.css",
  });
  assert.equal(counts.css, 1);
});
