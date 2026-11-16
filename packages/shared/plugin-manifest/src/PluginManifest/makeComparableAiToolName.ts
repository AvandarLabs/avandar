/**
 * The data agent's built-in tool names, which no plugin AI tool may take, so
 * the model never sees two tools it could mistake for each other. Keep it in
 * step with `DATA_AGENT_TOOLS`: a test beside that list fails when a built-in
 * tool is missing here.
 */
export const RESERVED_AI_TOOL_NAMES = [
  "run_query",
  "lookup_values",
  "ask_user",
] as const;

/**
 * Makes the form two AI tool names are compared in: lowercased with
 * underscores removed, so `runQuery` and `run_query` compare equal. Use it
 * to check a plugin tool name against `RESERVED_AI_TOOL_NAMES`.
 */
export function makeComparableAiToolName(name: string): string {
  return name.toLowerCase().replaceAll("_", "");
}
