import { DEFAULT_ACCENT, DEFAULT_BACKGROUND } from "../palette";
import { getReferenceUrlFromPreset } from "./getReferenceUrlFromPreset";
import type { Preset } from "./Preset.types";

type ReferenceOptions = {
  preset: Preset;
  accent?: string;
  background?: string;
};
/** Builds the reference-brief text for the selected motion references. */
export function useReferenceBrief(): (
  options: Readonly<ReferenceOptions>,
) => string {
  return ({
    preset,
    accent = DEFAULT_ACCENT,
    background = DEFAULT_BACKGROUND,
  }: Readonly<ReferenceOptions>) =>
    `Motion reference: ${preset.name}\nPreset: ${preset.id}\nCategory: ${preset.category}\nUse when: ${preset.useWhen}\nDirection: ${preset.prompt}\nTiming: ${preset.loopFrames / 30}-second loop, 30 fps\nAccent: ${accent}\nBackground: ${background}\nReference: ${getReferenceUrlFromPreset(preset)}\nThis is a conceptual motion graphic, not product footage. Replace illustrative content with approved story content.`;
}
