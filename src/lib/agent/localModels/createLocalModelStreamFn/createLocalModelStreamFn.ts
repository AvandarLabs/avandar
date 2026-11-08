import { createAssistantMessageEventStream } from "@earendil-works/pi-ai";
import {
  buildLocalActionSchema,
  parseLocalAction,
} from "@/lib/agent/localModels/createLocalModelStreamFn/localActionFormat";
import {
  getActiveTools,
  toLocalLlmMessages,
} from "@/lib/agent/localModels/createLocalModelStreamFn/toLocalLlmMessages";
import type {
  LocalLlm,
  LocalLlmCompletion,
} from "@/lib/agent/localModels/LocalLlm";
import type { StreamFn } from "@earendil-works/pi-agent-core";
import type {
  Api,
  AssistantMessage,
  AssistantMessageEventStream,
  JsonObject,
  Model,
  ToolCall,
  TranscriptContext,
  Usage,
} from "@earendil-works/pi-ai";

/** The Pi API id for models that run on the user's device. */
export const LOCAL_MODEL_API = "avandar-local";

/** Tokens a local model may write per step. Enough for one SQL query. */
const LOCAL_MAX_OUTPUT_TOKENS = 700;

/**
 * A Pi model record for a WebLLM model. Local models cost nothing per call,
 * so every price is zero.
 */
export function createLocalModel(
  options: Readonly<{ id: string; name: string; contextWindow: number }>,
): Model<Api> {
  return {
    id: options.id,
    name: options.name,
    api: LOCAL_MODEL_API,
    provider: "local",
    baseUrl: "",
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    reasoning: false,
    contextWindow: options.contextWindow,
    maxTokens: LOCAL_MAX_OUTPUT_TOKENS,
  };
}

function _toUsage(completion?: LocalLlmCompletion): Usage {
  const input = completion?.promptTokens ?? 0;
  const output = completion?.completionTokens ?? 0;
  return {
    input,
    output,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: input + output,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  };
}

function _createMessage(model: Model<Api>): AssistantMessage {
  return {
    role: "assistant",
    content: [],
    api: model.api,
    provider: model.provider,
    model: model.id,
    usage: _toUsage(),
    stopReason: "stop",
    timestamp: Date.now(),
  };
}

function _pushAction(
  stream: AssistantMessageEventStream,
  message: AssistantMessage,
  action: ReturnType<typeof parseLocalAction>,
): void {
  if (action.kind === "tool") {
    const toolCall: ToolCall = {
      type: "toolCall",
      id: `local-${crypto.randomUUID()}`,
      name: action.name,
      arguments: action.args as JsonObject,
    };
    message.content.push(toolCall);
    message.stopReason = "toolUse";
    stream.push({ type: "toolcall_start", contentIndex: 0, partial: message });
    stream.push({
      type: "toolcall_end",
      contentIndex: 0,
      toolCall,
      partial: message,
    });
    return;
  }
  message.content.push({ type: "text", text: action.text });
  stream.push({ type: "text_start", contentIndex: 0, partial: message });
  stream.push({
    type: "text_end",
    contentIndex: 0,
    content: action.text,
    partial: message,
  });
}

/**
 * A Pi stream function for models that run on the user's device. Each step
 * is one completion decoded under a JSON Schema of the available actions
 * (one per tool, plus a plain reply), so Pi's agent loop, tools, and caps
 * work the same as with a hosted model.
 */
export function createLocalModelStreamFn(
  options: Readonly<{
    llm: LocalLlm;
    temperature?: number;
    /**
     * False when this step must call a tool, for example a data question
     * that has not run a query yet. Small models otherwise tend to answer a
     * data question in words.
     */
    isReplyAllowed?: (context: TranscriptContext) => boolean;
  }>,
): StreamFn {
  return (model, context) => {
    const stream = createAssistantMessageEventStream();
    const message = _createMessage(model);
    const tools = getActiveTools(context);
    const isReplyAllowed = options.isReplyAllowed?.(context) ?? true;
    stream.push({ type: "start", partial: message });
    void options.llm
      .complete({
        modelId: model.id,
        messages: toLocalLlmMessages(context),
        maxTokens: model.maxTokens,
        temperature: options.temperature ?? 0,
        jsonSchema: buildLocalActionSchema(tools, { isReplyAllowed }),
      })
      .then((completion) => {
        message.usage = _toUsage(completion);
        const toolNames = tools.map((tool) => {
          return tool.name;
        });
        _pushAction(
          stream,
          message,
          parseLocalAction(completion.text, toolNames),
        );
        stream.push({
          type: "done",
          reason: message.stopReason === "toolUse" ? "toolUse" : "stop",
          message,
        });
      })
      .catch((error: unknown) => {
        message.stopReason = "error";
        message.errorMessage =
          error instanceof Error ? error.message : String(error);
        stream.push({ type: "error", reason: "error", error: message });
      });
    return stream;
  };
}
