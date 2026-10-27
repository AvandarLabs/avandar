import type { Preset } from "./Preset.types";
/** The shareable gallery URL for a preset. */
export function getReferenceUrlFromPreset(preset: Readonly<Preset>): string {
  return `${window.location.origin}${window.location.pathname}#${preset.id}`;
}
