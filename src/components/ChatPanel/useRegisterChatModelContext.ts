import { useAui } from "@assistant-ui/react";
import { useEffect } from "react";

/**
 * Registers the selected OpenRouter model with assistant-ui's ModelContext so
 * the chat adapter can read `context.config.modelName` on each run.
 */
export function useRegisterChatModelContext(modelId: string | undefined): void {
  const assistantClient = useAui();

  useEffect(() => {
    if (!modelId) {
      return;
    }
    return assistantClient.modelContext().register({
      getModelContext: () => {
        return {
          config: {
            modelName: modelId,
          },
        };
      },
    });
  }, [assistantClient, modelId]);
}
