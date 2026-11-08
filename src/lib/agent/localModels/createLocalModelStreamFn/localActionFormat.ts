import type { Tool } from "@earendil-works/pi-ai";

/**
 * The action name a local model uses to answer in plain text instead of
 * calling a tool.
 */
export const LOCAL_REPLY_ACTION = "reply";

/** One step a local model chose: a tool call or a plain reply. */
export type LocalAction =
  | { kind: "tool"; name: string; args: Record<string, unknown> }
  | { kind: "reply"; text: string };

type JsonSchemaProperty = {
  type?: string;
  description?: string;
  enum?: readonly string[];
};

/**
 * The JSON Schema for one step: `{"action": "<tool>", "args": {...}}` for
 * each tool, or `{"action": "reply", "text": "..."}` unless a reply is not
 * allowed yet. Local models decode under this schema, so their output is
 * always one valid action.
 */
export function buildLocalActionSchema(
  tools: readonly Tool[],
  options: Readonly<{ isReplyAllowed?: boolean }> = {},
): object {
  const toolOptions = tools.map((tool) => {
    return {
      type: "object",
      properties: {
        action: { type: "string", enum: [tool.name] },
        args: tool.parameters,
      },
      required: ["action", "args"],
      additionalProperties: false,
    };
  });
  const replyOption = {
    type: "object",
    properties: {
      action: { type: "string", enum: [LOCAL_REPLY_ACTION] },
      text: { type: "string" },
    },
    required: ["action", "text"],
    additionalProperties: false,
  };
  const isReplyAllowed = options.isReplyAllowed ?? true;
  return {
    anyOf: isReplyAllowed ? [...toolOptions, replyOption] : toolOptions,
  };
}

function _describeArgument(
  name: string,
  property: JsonSchemaProperty,
  isRequired: boolean,
): string {
  const kind = property.enum
    ? `one of ${property.enum.join(", ")}`
    : (property.type ?? "value");
  const optional = isRequired ? "" : ", optional";
  const description = property.description ? `: ${property.description}` : "";
  return `    ${name} (${kind}${optional})${description}`;
}

function _describeTool(tool: Tool): string {
  const parameters = tool.parameters as {
    properties?: Record<string, JsonSchemaProperty>;
    required?: readonly string[];
  };
  const argumentLines = Object.entries(parameters.properties ?? {}).map(
    ([name, property]) => {
      return _describeArgument(
        name,
        property,
        parameters.required?.includes(name) ?? false,
      );
    },
  );
  return [`- ${tool.name}: ${tool.description}`, ...argumentLines].join("\n");
}

/** Instructions that teach a local model the one-action reply format. */
export function buildLocalActionInstructions(tools: readonly Tool[]): string {
  return `REPLY FORMAT
Reply with exactly one JSON object and nothing else.
- To use a tool: {"action": "<tool name>", "args": {...}}
- To answer in words: {"action": "${LOCAL_REPLY_ACTION}", "text": "..."}

TOOL LIST
${tools.map(_describeTool).join("\n")}`;
}

/** Writes an action the way the model would have, for the chat history. */
export function formatLocalAction(action: LocalAction): string {
  return action.kind === "tool"
    ? JSON.stringify({ action: action.name, args: action.args })
    : JSON.stringify({ action: LOCAL_REPLY_ACTION, text: action.text });
}

function _isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Qwen3 writes a thinking block, empty with thinking off, before replying. */
const THINKING_BLOCK_PATTERN = /^\s*<think>[\s\S]*?<\/think>\s*/;

/**
 * Reads a local model's output. Anything that is not a known action, such
 * as prose from a runtime without constrained decoding, is a plain reply.
 */
export function parseLocalAction(
  output: string,
  toolNames: readonly string[],
): LocalAction {
  const text = output.replace(THINKING_BLOCK_PATTERN, "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { kind: "reply", text: text.trim() };
  }
  if (!_isRecord(parsed)) {
    return { kind: "reply", text: text.trim() };
  }
  const action = parsed.action;
  if (typeof action === "string" && toolNames.includes(action)) {
    return {
      kind: "tool",
      name: action,
      args: _isRecord(parsed.args) ? parsed.args : {},
    };
  }
  return {
    kind: "reply",
    text: typeof parsed.text === "string" ? parsed.text : text.trim(),
  };
}
