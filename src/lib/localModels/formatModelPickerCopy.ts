/**
 * Shared copy helpers for offline chat model pickers.
 */

/** Option label: name, RAM tier, and optional download size. */
export function formatModelSelectLabel(args: {
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
export function formatModelSelectDescription(args: {
  description: string;
  recommendedIf: string;
  approxSizeMb: number;
}): string {
  return `${args.description} ${args.recommendedIf} (~${args.approxSizeMb} MB download).`;
}
