import { PluginError } from "@avandar/plugin-sdk";
import { getOnScreenQueryResult } from "@/lib/agent/dataAgent/getOnScreenQueryResult/getOnScreenQueryResult";
import { QueryHandleRegistry } from "@/lib/plugins/QueryHandleRegistry/QueryHandleRegistry";
import type { PluginAiToolDeclaration } from "$/agent/dataAgent/pluginAiTools.types";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AgentQueryResultData } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import type { AgentToolContext } from "@avandar/plugin-sdk";

type AiToolArgs = Readonly<Record<string, string | number | boolean>>;

/** What the data agent's model reads back from a plugin AI tool call. */
export type PluginAiToolOutcome = { text: string; isError: boolean };

/** The largest tool result, in UTF-8 bytes, the model is shown. */
const MAX_TOOL_RESULT_BYTES = 2048;

const NO_RESULT_TEXT = "No result is on screen.";
const TOOL_FAILED_TEXT = "The tool failed.";
const TOOL_RESULT_TOO_LARGE_TEXT = "The tool result was too large.";

function _buildOutcomeFromToolResult(toolResult: unknown): PluginAiToolOutcome {
  if (
    typeof toolResult !== "object" ||
    toolResult === null ||
    Array.isArray(toolResult)
  ) {
    return { text: TOOL_FAILED_TEXT, isError: true };
  }
  const text = JSON.stringify(toolResult);
  if (new TextEncoder().encode(text).byteLength >= MAX_TOOL_RESULT_BYTES) {
    return { text: TOOL_RESULT_TOO_LARGE_TEXT, isError: true };
  }
  return { text, isError: false };
}

function _buildOutcomeFromError(error: unknown): PluginAiToolOutcome {
  // Only an InvalidToolInput message is written for the model. Any other
  // error text can quote a cell value, so it never reaches the model.
  if (error instanceof PluginError && error.code === "InvalidToolInput") {
    return { text: error.message, isError: true };
  }
  return { text: TOOL_FAILED_TEXT, isError: true };
}

/**
 * Runs a plugin AI tool against the query result on screen and returns the
 * text the data agent's model reads. Nothing on screen, a thrown error, a
 * result that is not a JSON object, or a result of 2,048 UTF-8 bytes or more
 * each become a fixed host message, except an `InvalidToolInput` error, whose
 * message is forwarded. Never throws.
 *
 * A chat result's query handle is released once the tool finishes. The
 * explorer's handle stays registered, since the explorer still shows it.
 */
export async function runPluginAiTool(options: {
  declaration: PluginAiToolDeclaration;
  args: AiToolArgs;
  isDataExplorer: boolean;
  chatResults: readonly AgentQueryResultData[];
  runQuery: (sql: string) => Promise<QueryResult.T | { error: string }>;
  invoke: (context: AgentToolContext, args: AiToolArgs) => Promise<unknown>;
}): Promise<PluginAiToolOutcome> {
  const onScreenResult = await getOnScreenQueryResult(options);
  if (onScreenResult.kind === "none") {
    return { text: NO_RESULT_TEXT, isError: true };
  }
  const context: AgentToolContext = {
    slotId: "agent.tool",
    queryHandle: onScreenResult.handle,
    columns: onScreenResult.columns,
    rowCount: onScreenResult.rowCount,
  };
  try {
    return _buildOutcomeFromToolResult(
      await options.invoke(context, options.args),
    );
  } catch (error) {
    return _buildOutcomeFromError(error);
  } finally {
    if (onScreenResult.source === "chat") {
      QueryHandleRegistry.release(onScreenResult.handle);
    }
  }
}
