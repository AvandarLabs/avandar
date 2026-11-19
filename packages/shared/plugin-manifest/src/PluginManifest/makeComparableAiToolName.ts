/**
 * The built-in tool names of the data agent, which no plugin AI tool may
 * take, so the model never sees two tools it could mistake for each other.
 * It holds the tools of both agents: the online and SQL agent's `run_query`,
 * `lookup_values`, and `ask_user`, `plan_query`, which only the on-device
 * plan agent offers, and `add_dashboard_block`, which both offer from prompt
 * `data-agent-v6`. The plan agent drops plugin tools, but its names stay
 * reserved so a plugin cannot shadow them if that changes. Keep it in step
 * with the built-in tools: tests beside `DATA_AGENT_TOOLS` and the tool
 * factories fail when a built-in tool is missing here.
 */
export const RESERVED_AI_TOOL_NAMES = [
  "run_query",
  "lookup_values",
  "ask_user",
  "plan_query",
  "add_dashboard_block",
] as const;

/**
 * Makes the form two AI tool names are compared in: lowercased with
 * underscores removed, so `runQuery` and `run_query` compare equal. Use it
 * to check a plugin tool name against `RESERVED_AI_TOOL_NAMES`.
 */
export function makeComparableAiToolName(name: string): string {
  return name.toLowerCase().replaceAll("_", "");
}
