import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { stockRenderers } from "../../registry/stockRenderers/stockRenderers";
import type { LEGACY_IDS } from "../../../../tests/fixtures/legacyStockIds";

const BASELINE: {
  records: Array<{
    preset: (typeof LEGACY_IDS)[number];
    frame: number;
    svg: string;
  }>;
} = JSON.parse(
  readFileSync(
    new URL(
      "../../presets/legacy/legacyContracts/legacy-default-svg.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
/**
 * Markup that draws the same SVG: generated ids collapsed, each tag's
 * attributes in name order (themed shapes spread their props in a different
 * order), and `stroke-width="1"` dropped because it is SVG's default width.
 */
const _normalizeSvgIds = (markup: string): string => {
  return markup
    .replace(/stock-[a-zA-Z0-9_]+(?=-)/g, "stock-ID")
    .replace(/<([a-zA-Z]+)((?:\s+[^\s=>]+="[^"]*")*)\s*(\/?)>/g, (...match) => {
      const [, tag, attributes, selfClosing] = match as string[];
      const sorted = (attributes.match(/[^\s=>]+="[^"]*"/g) ?? [])
        .filter((attribute) => {
          return attribute !== 'stroke-width="1"';
        })
        .sort();
      return `<${[tag, ...sorted].join(" ")}${selfClosing}>`;
    });
};
const _render = ({
  preset,
  input,
}: Readonly<{
  preset: (typeof LEGACY_IDS)[number];
  input: unknown;
}>): string => {
  return renderToStaticMarkup(
    createElement(
      "svg",
      null,
      stockRenderers[preset](
        { frame: 150, accent: "#9fefca", id: "test" },
        input,
      ),
    ),
  );
};
/**
 * Renders and normalizes legacy samples for behavioral preservation assertions.
 */
export const LegacyRenderHarness = {
  /** Recorded legacy SVG frames used as visual preservation references. */
  BASELINE,
  /** Markup that draws the same SVG: generated ids collapsed, each tag's
    attributes in name order (themed shapes spread their props in a different
    order), and `stroke-width="1"` dropped because it is SVG's default width. */
  normalizeSvgIds: _normalizeSvgIds,
  /** Returns a legacy preset's settled SVG at frame 150 for supplied input. */
  render: _render,
} as const;
