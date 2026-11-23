import type { CSSProperties } from "react";
/**
 * The mask that erases an element left to right behind a soft edge, at
 * `progress` from 0 (intact) to 1 (gone). `feather` is the edge width as a
 * fraction of the element. Use it for quiet exits that clear a light field
 * one element at a time, for example chart rows before a cut, where a
 * whole-frame wipe would be too loud.
 */
export function getEraseMaskStyle({
  progress,
  feather = 0.1,
}: Readonly<{
  progress: number;
  feather?: number;
}>): CSSProperties {
  if (progress <= 0) {
    return {};
  }
  if (progress >= 1) {
    return { opacity: 0 };
  }
  // The edge starts fully left of the element and ends fully right of it.
  const edge = progress * (1 + feather) * 100;
  const gradient = `linear-gradient(to right, transparent ${_formatPercent(edge - feather * 100)}, black ${_formatPercent(edge)})`;
  return { maskImage: gradient, WebkitMaskImage: gradient };
}
function _formatPercent(value: number): string {
  return `${Number(value.toFixed(2))}%`;
}
