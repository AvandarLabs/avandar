import { STOCK_CATALOG } from "../../stock/catalog";
import { DEFAULT_ACCENT, DEFAULT_BACKGROUND } from "../palette";

/** A single preset from the stock motion catalog, as rendered in the gallery. */
export type Preset = (typeof STOCK_CATALOG)[number];

export const reduceMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function referenceUrl(preset: Preset) {
  return `${window.location.origin}${window.location.pathname}#${preset.id}`;
}

export function referenceBrief(
  preset: Preset,
  accent: string = DEFAULT_ACCENT,
  background: string = DEFAULT_BACKGROUND,
) {
  return `Motion reference: ${preset.name}\nPreset: ${preset.id}\nCategory: ${preset.category}\nUse when: ${preset.useWhen}\nDirection: ${preset.prompt}\nTiming: ${preset.loopFrames / 30}-second loop, 30 fps\nAccent: ${accent}\nBackground: ${background}\nReference: ${referenceUrl(preset)}\nThis is a conceptual motion graphic, not product footage. Replace illustrative content with approved story content.`;
}
