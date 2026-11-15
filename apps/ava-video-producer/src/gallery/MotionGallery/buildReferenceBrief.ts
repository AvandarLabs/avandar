import { DEFAULT_ACCENT, DEFAULT_BACKGROUND } from "../palette";
import { getReferenceUrlFromPreset } from "./getReferenceUrlFromPreset";
import type { Preset } from "./Preset.types";

/**
 * The creative-brief text for one motion, which a designer pastes into a
 * request. It names the preset, its direction and timing, and the theme's
 * accent and background, and warns that the graphic is conceptual.
 */
export function buildReferenceBrief({
  preset,
  accent = DEFAULT_ACCENT,
  background = DEFAULT_BACKGROUND,
}: Readonly<{
  preset: Preset;
  accent?: string;
  background?: string;
}>): string {
  return `Motion reference: ${preset.name}\nPreset: ${preset.id}\nCategory: ${preset.category}\nUse when: ${preset.useWhen}\nDirection: ${preset.prompt}\nTiming: ${preset.loopFrames / 30}-second loop, 30 fps\nAccent: ${accent}\nBackground: ${background}\nReference: ${getReferenceUrlFromPreset(preset)}\nThis is a conceptual motion graphic, not product footage. Replace illustrative content with approved story content.`;
}
