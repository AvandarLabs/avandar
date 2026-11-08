import { OFFLINE_CHAT_CONTEXT_WINDOW_SIZE } from "@/stores/OfflineChatEngineStore/createLocalModelRuntime/offlineChatContextWindow";
import { deleteLocalChatModelCache } from "@/stores/OfflineChatEngineStore/deleteLocalChatModelCache/deleteLocalChatModelCache";
import type { LocalLlmCompletion } from "@/lib/agent/localModels/LocalLlm";
import type {
  LocalModelRequest,
  LocalModelRuntime,
} from "@/stores/OfflineChatEngineStore/createLocalModelRuntime/createLocalModelRuntime";

type CompletionInput = {
  messages: Array<{ role: string; content: string }>;
  max_tokens: number;
  temperature: number;
  stream?: boolean;
  response_format?: { type: "json_object"; schema: string };
  extra_body: { enable_thinking: boolean };
};

type CompletionReply = {
  choices: Array<{ message: { content: string | null } }>;
  usage?: { prompt_tokens: number; completion_tokens: number };
};

type CompletionChunk = {
  choices: Array<{ delta: { content?: string | null } }>;
};

/** The part of WebLLM's `MLCEngine` the runtime uses. */
export type WebLlmEngine = {
  reload: (
    modelId: string,
    chatOpts: { context_window_size: number },
  ) => Promise<void>;
  unload: () => Promise<void>;
  setInitProgressCallback: (
    callback: (report: {
      progress: number;
      text: string;
      timeElapsed: number;
    }) => void,
  ) => void;
  chat: {
    completions: {
      create: (
        input: CompletionInput,
      ) => Promise<CompletionReply | AsyncIterable<CompletionChunk>>;
    };
  };
};

async function _createMlcEngine(): Promise<WebLlmEngine> {
  const { MLCEngine } = await import("@mlc-ai/web-llm");
  // `WebLlmEngine` names only the members the runtime calls. WebLLM's
  // `create` is overloaded per message role and stream flag, which one
  // non-overloaded signature cannot be checked against, so this one cast
  // stands in for that check.
  return new MLCEngine() as WebLlmEngine;
}

function _buildCompletionInput(request: Readonly<LocalModelRequest>) {
  return {
    messages: request.messages.map((message) => {
      return { role: message.role, content: message.content };
    }),
    max_tokens: request.maxTokens,
    temperature: request.temperature ?? 0,
    ...(request.jsonSchema
      ? {
          response_format: {
            type: "json_object" as const,
            schema: JSON.stringify(request.jsonSchema),
          },
        }
      : {}),
    // Qwen3 thinks before answering by default, which costs a small model
    // most of its token budget.
    extra_body: { enable_thinking: false },
  };
}

async function _streamCompletion(
  engine: WebLlmEngine,
  request: Readonly<LocalModelRequest>,
  onToken: (delta: string) => void,
): Promise<LocalLlmCompletion> {
  const stream = (await engine.chat.completions.create({
    ..._buildCompletionInput(request),
    stream: true,
  })) as AsyncIterable<CompletionChunk>;
  const deltas: string[] = [];
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? "";
    if (delta) {
      deltas.push(delta);
      onToken(delta);
    }
  }
  return { text: deltas.join(""), promptTokens: 0, completionTokens: 0 };
}

/**
 * The offline chat runtime on WebLLM over WebGPU: one `MLCEngine`, created
 * on first use so WebLLM stays out of the main bundle, that reloads when a
 * different model is asked for. Pass `createEngine` in tests to skip the
 * real package.
 */
export function createWebLlmModelRuntime(
  options: Readonly<{ createEngine?: () => Promise<WebLlmEngine> }> = {},
): LocalModelRuntime {
  let enginePromise: Promise<WebLlmEngine> | undefined;
  const getEngine = (): Promise<WebLlmEngine> => {
    enginePromise ??= (options.createEngine ?? _createMlcEngine)();
    return enginePromise;
  };
  return {
    load: async (modelId, onProgress) => {
      const engine = await getEngine();
      engine.setInitProgressCallback((report) => {
        onProgress?.(Math.min(1, Math.max(0, report.progress)));
      });
      await engine.reload(modelId, {
        context_window_size: OFFLINE_CHAT_CONTEXT_WINDOW_SIZE,
      });
    },
    complete: async (request) => {
      const engine = await getEngine();
      if (request.onToken) {
        return _streamCompletion(engine, request, request.onToken);
      }
      const reply = (await engine.chat.completions.create(
        _buildCompletionInput(request),
      )) as CompletionReply;
      return {
        text: reply.choices[0]?.message?.content ?? "",
        promptTokens: reply.usage?.prompt_tokens ?? 0,
        completionTokens: reply.usage?.completion_tokens ?? 0,
      };
    },
    unload: async () => {
      if (enginePromise) {
        await (await enginePromise).unload();
      }
    },
    deleteFromCache: deleteLocalChatModelCache,
  };
}
