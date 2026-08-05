import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";
import type {
  OfflineChatCompletionRequest,
  OfflineChatEngine,
} from "$/types/offlineChat.types";

type MlcEngine = {
  chat: {
    completions: {
      create: (input: {
        messages: Array<{ role: string; content: string }>;
        max_tokens: number;
        stream?: boolean;
      }) => Promise<
        | { choices: Array<{ message: { content: string } }> }
        | AsyncIterable<{ choices: Array<{ delta: { content?: string } }> }>
      >;
    };
  };
};

export type WebLlmEngineFactory = (
  mlcModelId: string,
  initProgressCallback?: (report: { text: string; progress: number }) => void,
) => Promise<MlcEngine>;

/**
 * Loads `@mlc-ai/web-llm` lazily. Pass `factory` in tests to skip the
 * real package import.
 */
export function createWebLlmOfflineChatEngine(args: {
  modelId: LocalChatModel.Id;
  onDownloadProgress?: (report: { text: string; progress: number }) => void;
  factory?: WebLlmEngineFactory;
}): OfflineChatEngine {
  const catalog = LocalChatModel.Catalog.find(args.modelId);
  let enginePromise: Promise<MlcEngine> | undefined;

  const loadEngine = async (): Promise<MlcEngine> => {
    if (!enginePromise) {
      enginePromise = (async () => {
        if (args.factory) {
          return args.factory(catalog.mlcModelId, args.onDownloadProgress);
        }
        const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
        return (await CreateMLCEngine(catalog.mlcModelId, {
          initProgressCallback: args.onDownloadProgress,
        })) as MlcEngine;
      })();
    }
    return enginePromise;
  };

  return {
    async preload(): Promise<void> {
      await loadEngine();
    },
    async complete(request: OfflineChatCompletionRequest): Promise<string> {
      const engine = await loadEngine();
      const messages = request.messages.map((message) => {
        return { role: message.role, content: message.content };
      });

      if (request.onToken) {
        const stream = await engine.chat.completions.create({
          messages,
          max_tokens: request.maxTokens,
          stream: true,
        });
        let text = "";
        for await (const chunk of stream as AsyncIterable<{
          choices: Array<{ delta: { content?: string } }>;
        }>) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (delta) {
            text += delta;
            request.onToken(delta);
          }
        }
        return text;
      }

      const result = await engine.chat.completions.create({
        messages,
        max_tokens: request.maxTokens,
      });
      const nonStream = result as {
        choices: Array<{ message: { content: string } }>;
      };
      return nonStream.choices[0]?.message?.content ?? "";
    },
    async unload(): Promise<void> {
      enginePromise = undefined;
    },
  };
}
