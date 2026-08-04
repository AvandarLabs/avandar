/**
 * Shared copy helpers for offline chat model pickers.
 */

import { t } from "@lingui/core/macro";

/** Option label: name, RAM tier, and optional download size. */
function _formatLabel(args: {
  displayName: string;
  systemRequirements: string;
  approxSizeMb: number;
  downloadedSuffix?: string;
}): string {
  const sizePart = `(~${args.approxSizeMb} MB)`;
  const base = `${args.displayName} · ${args.systemRequirements} ${sizePart}`;
  return args.downloadedSuffix ? `${base}${args.downloadedSuffix}` : base;
}

/** Select `description`: capability blurb plus recommendation. */
function _formatDescription(args: {
  description: string;
  recommendedIf: string;
  approxSizeMb: number;
}): string {
  const { description, recommendedIf, approxSizeMb } = args;
  return t`${description} ${recommendedIf} (~${approxSizeMb} MB download).`;
}

/** Copy formatting for local-model picker labels and descriptions. */
export const ModelPickerCopy = {
  formatLabel: _formatLabel,
  formatDescription: _formatDescription,
};
