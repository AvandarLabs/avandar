import type { LEGACY_IDS } from "../../../../../../tests/fixtures/legacyStockIds";

/**
 * Approved markup changes in the legacy capture, kept as recorded. Each move
 * is one exact string rewritten once before comparing:
 * - captions moved to the shared caption style (17 px at baseline 551);
 * - halo glows consolidated to the shared 0.03 opacity;
 * - 1 px hairlines that now pass an explicit `stroke-width="1"`, which draws
 *   the same pixels as the SVG default;
 * - rotated orbits whose rotation moved from the ellipse to a wrapping group.
 */
const APPROVED_MARKUP_MOVES: Partial<
  Record<
    (typeof LEGACY_IDS)[number],
    ReadonlyArray<Readonly<{ from: string; to: string }>>
  >
> = {
  "code-focus": [
    // The title-bar and footer dividers gain the explicit hairline.
    ...["M70 164 H890", "M84 478 H876"].map((path) => {
      return {
        from: `<path d="${path}" stroke="#2a404e"></path>`,
        to: `<path d="${path}" stroke="#2a404e" stroke-width="1"></path>`,
      };
    }),
  ],
  "data-pipeline": [
    // Each stage's accent outline gains the explicit hairline, matched by the
    // stage number that follows it because its opacity moves with progress.
    ...[86, 306, 526, 746].map((x) => {
      return {
        from: `"></rect><text x="${x}" y="239"`,
        to: `" stroke-width="1"></rect><text x="${x}" y="239"`,
      };
    }),
    // Each stage icon's rim gains the explicit hairline once, in drawing order.
    ...[0, 1, 2, 3].map(() => {
      return {
        from: 'stroke-opacity="0.35"></circle>',
        to: 'stroke-opacity="0.35" stroke-width="1"></circle>',
      };
    }),
  ],
  "node-traversal": [
    { from: '<text x="480" y="545"', to: '<text x="480" y="551"' },
  ],
  "orbital-system": [
    // Each orbit draws as a sketch-aware ellipse inside a rotated group, once
    // per body in drawing order.
    ...[
      { rx: 294, ry: 122, color: "#9fefca", angle: -24 },
      { rx: 294, ry: 122, color: "#82c8f2", angle: 24 },
      { rx: 185, ry: 185, color: "#f0ba83", angle: 0 },
    ].map(({ rx, ry, color, angle }) => {
      const ellipse = `<ellipse cx="480" cy="298" rx="${rx}" ry="${ry}" fill="none" stroke="${color}" stroke-opacity="0.24" stroke-width="1.5"`;
      const rotation = `rotate(${angle} 480 298)`;
      return {
        from: `${ellipse} transform="${rotation}"></ellipse>`,
        to: `<g transform="${rotation}">${ellipse}></ellipse></g>`,
      };
    }),
    ...["#9fefca", "#82c8f2", "#f0ba83"].map((color) => {
      return {
        from: `text-anchor="middle" fill="${color}" font-size="12" font-family`,
        to: `fill="${color}" font-size="12" font-weight="400" text-anchor="middle" font-family`,
      };
    }),
    // Each body shell gains the explicit hairline once, in drawing order.
    ...[0, 1, 2].map(() => {
      return {
        from: 'stroke-opacity="0.24">',
        to: 'stroke-opacity="0.24" stroke-width="1">',
      };
    }),
    {
      from: 'fill-opacity="0.025" stroke="#9fefca" stroke-opacity="0.1">',
      to: 'fill-opacity="0.03" stroke="#9fefca" stroke-opacity="0.1" stroke-width="1">',
    },
    {
      from: 'r="49" fill="#101e28" stroke="#9fefca" stroke-opacity="0.7">',
      to: 'r="49" fill="#101e28" stroke="#9fefca" stroke-opacity="0.7" stroke-width="1">',
    },
    {
      from: '<text x="480" y="551" fill="#728794" font-size="18"',
      to: '<text x="480" y="551" fill="#728794" font-size="17"',
    },
  ],
  "plexus-field": [
    {
      from: '<line x1="64" y1="529" x2="896" y2="529" stroke="#2a404e">',
      to: '<line x1="64" y1="529" x2="896" y2="529" stroke="#2a404e" stroke-width="1">',
    },
  ],
  "radial-network": [
    {
      from: '<ellipse cx="480" cy="295" rx="278" ry="181" fill="none" stroke="#2a404e" stroke-dasharray',
      to: '<ellipse cx="480" cy="295" rx="278" ry="181" fill="none" stroke="#2a404e" stroke-width="1" stroke-dasharray',
    },
    {
      from: 'r="70" fill="#101e28" stroke="#9fefca" stroke-opacity="0.4">',
      to: 'r="70" fill="#101e28" stroke="#9fefca" stroke-opacity="0.4" stroke-width="1">',
    },
    {
      from: 'r="59" fill="#9fefca" fill-opacity="0.035"',
      to: 'r="59" fill="#9fefca" fill-opacity="0.03"',
    },
    {
      from: '<text x="480" y="560" fill="#728794" font-size="15"',
      to: '<text x="480" y="551" fill="#728794" font-size="17"',
    },
  ],
  "schema-mapping": [
    // Each panel's title divider gains the explicit hairline.
    ...["64", "598"].map((x1) => {
      return {
        from: `<line x1="${x1}" y1="202" x2="${Number(x1) + 298}" y2="202" stroke="#2a404e"></line>`,
        to: `<line x1="${x1}" y1="202" x2="${Number(x1) + 298}" y2="202" stroke="#2a404e" stroke-width="1"></line>`,
      };
    }),
    // Each match ring gains the explicit hairline once, in drawing order.
    ...[0, 1, 2, 3].map(() => {
      return {
        from: 'stroke-opacity="0.6"></circle>',
        to: 'stroke-opacity="0.6" stroke-width="1"></circle>',
      };
    }),
  ],
  "source-merge": [
    // Each source chip's outline gains the explicit hairline once, in drawing
    // order.
    ...[0, 1, 2].map(() => {
      return {
        from: 'stroke-opacity="0.3"></rect>',
        to: 'stroke-opacity="0.3" stroke-width="1"></rect>',
      };
    }),
    // The merge node's rim gains the explicit hairline.
    {
      from: 'stroke-opacity="0.65"></circle>',
      to: 'stroke-opacity="0.65" stroke-width="1"></circle>',
    },
  ],
  "terminal-type": [
    // The shared code window's title-bar divider gains the explicit hairline.
    {
      from: '<path d="M70 164 H890" stroke="#2a404e"></path>',
      to: '<path d="M70 164 H890" stroke="#2a404e" stroke-width="1"></path>',
    },
  ],
};

/** The baseline markup for a preset with its approved moves applied. */
export const applyApprovedMoves = (
  preset: (typeof LEGACY_IDS)[number],
  markup: string,
): string => {
  return (APPROVED_MARKUP_MOVES[preset] ?? []).reduce((moved, { from, to }) => {
    return moved.replace(from, to);
  }, markup);
};
