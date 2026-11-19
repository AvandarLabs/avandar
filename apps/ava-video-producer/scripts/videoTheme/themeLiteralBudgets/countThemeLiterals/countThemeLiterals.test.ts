import assert from "node:assert/strict";
import test from "node:test";
import {
  countThemeLiteralsFromSource,
  sumThemeLiteralCounts,
} from "./countThemeLiterals";

function _count(source: string, fileName = "Shape.tsx") {
  return countThemeLiteralsFromSource(fileName, source);
}

test("palette reads, hex strings, and colour functions count as colour", () => {
  const counts = _count(`
    const a = STOCK.mint;
    const b = "#9fefca";
    const c = \`rgba(0, 0, 0, \${alpha})\`;
    const d = <rect fill="white" />;
  `);
  assert.equal(counts.colour, 4);
});

test("comments and imports never count", () => {
  const counts = _count(`
    import { STAGGER, EASE } from "../../motion";
    // const a = STOCK.mint; strokeWidth={3}
    /* "#ffffff" */
    export const value = 1;
  `);
  assert.equal(sumThemeLiteralCounts(counts), 0);
});

test("a ramp with a literal duration and no curve counts twice", () => {
  const counts = _count(`
    const t = ramp(frame, 40, 12);
    const u = ramp(frame, 40, motion.panel, motion.entrance.easing);
    const v = enter(frame, 10, { dur: 9, y: 12 });
    const w = EASE.inOut(t) + DUR.panel + STAGGER;
  `);
  assert.deepEqual([counts.motion, counts.implicitEasing], [6, 1]);
});

test("numeric line attributes and decimal opacities count as line", () => {
  const counts = _count(`
    <rect rx={8} strokeWidth={3} opacity={0.5} fillOpacity={1}
      strokeDasharray="4 4" stroke="none" />
  `);
  assert.deepEqual([counts.line, counts.sketch], [4, 0]);
});

test("stroked raw shapes count as sketch bypass", () => {
  const counts = _count(`
    <g>
      <circle r={4} stroke={color} />
      <StockRect stroke={color} />
      <path d="M0 0" stroke="none" />
    </g>
  `);
  assert.equal(counts.sketch, 1);
});

test("text sizes count on Text and raw text, never on FitText", () => {
  const counts = _count(`
    <g>
      <Text size={18} weight={600} />
      <text fontSize={14} fontFamily="Arial, sans-serif" />
      <FitText fontSize={16} />
    </g>
  `);
  assert.equal(counts.type, 4);
});

test("starter palette names count apart from colour", () => {
  const counts = _count(
    `const style = { color: "var(--brand)", borderRadius: "var(--radius)" };`,
  );
  assert.deepEqual([counts.starter, counts.colour], [2, 0]);
});

test("stylesheet values count unless they read a variable", () => {
  const counts = _count(
    `.a { color: #fff; font-size: var(--size); border-radius: 4px; }`,
    "Shape.module.css",
  );
  assert.equal(counts.css, 3);
});

test("stage geometry lengths are structural but spacing and variable radii are judged apart", () => {
  const counts = _count(
    `.a { width: 640px; top: 73px; grid-template-columns: 360px 1fr; gap: 24px; border-radius: var(--r); }`,
    "Stage.module.css",
  );
  assert.equal(counts.css, 1);
});

test("the chrome token sheet declares the chrome scale, so only that exact path is skipped", () => {
  const sheet = `:root { --atlas-space-12: 12px; --atlas-color-white: #fff; }`;
  assert.equal(_count(sheet, "showcase/chrome-tokens.css").css, 0);
  assert.equal(_count(sheet, "showcase/motion.css").css, 2);
  assert.equal(_count(sheet, "src/gallery/chrome-tokens.css").css, 2);
});

test("transitions and animations count only when a timing literal remains outside variables", () => {
  const counts = _count(
    `.a { transition: opacity var(--fast), transform var(--fast); }
     .b { transition: none !important; animation: none !important; }
     .c { transition: opacity 0.15s; }
     .d { transition: color var(--fast) ease-in-out; }
     .e { animation: spin 300ms linear infinite; }
     .f { transition-timing-function: cubic-bezier(0.2, 0, 0, 1); }`,
    "Shape.module.css",
  );
  assert.equal(counts.css, 5);
});

test("CSS-wide keywords never count as font literals", () => {
  const counts = _count(
    `.a { font-family: inherit; font-size: inherit; font-weight: unset; }
     .b { font-family: Georgia, serif; }`,
    "Shape.module.css",
  );
  assert.equal(counts.css, 1);
});
