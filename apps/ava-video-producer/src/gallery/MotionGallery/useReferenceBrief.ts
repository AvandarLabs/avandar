import { useLingui } from "@lingui/react/macro";
import { DEFAULT_ACCENT, DEFAULT_BACKGROUND } from "../palette";
import { getReferenceUrlFromPreset } from "./getReferenceUrlFromPreset";
import type { Preset } from "./Preset.types";
type ReferenceOptions = {
  preset: Preset;
  accent?: string;
  background?: string;
};
/** Translates reference-brief copy in the gallery's active UI context. */
export function useReferenceBrief(): (
  options: Readonly<ReferenceOptions>,
) => string {
  const { t } = useLingui();
  return ({
    preset,
    accent = DEFAULT_ACCENT,
    background = DEFAULT_BACKGROUND,
  }: Readonly<ReferenceOptions>) =>
    t`Motion reference: ${preset.name}\nPreset: ${preset.id}\nCategory: ${preset.category}\nUse when: ${preset.useWhen}\nDirection: ${preset.prompt}\nTiming: ${preset.loopFrames / 30}-second loop, 30 fps\nAccent: ${accent}\nBackground: ${background}\nReference: ${getReferenceUrlFromPreset(preset)}\nThis is a conceptual motion graphic, not product footage. Replace illustrative content with approved story content.`;
}
