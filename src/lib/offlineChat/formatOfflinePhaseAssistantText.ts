/**
 * Prefixes phased offline status lines so the thread shows progress while the
 * model runs multiple inferences.
 */
export function formatOfflinePhaseAssistantText(args: {
  phaseLabels: readonly string[];
  body: string;
}): string {
  const uniquePhases = [...new Set(args.phaseLabels)];
  if (uniquePhases.length === 0) {
    return args.body;
  }
  const header = uniquePhases.map((label) => {return `_(${label})_`}).join("\n\n");
  return `${header}\n\n${args.body}`;
}
