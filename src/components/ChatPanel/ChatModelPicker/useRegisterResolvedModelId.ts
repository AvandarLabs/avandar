import { useEffect } from "react";
import type { useAui } from "@assistant-ui/react";

/** Registers the resolved model id with assistant-ui for each chat run. */
export function useRegisterResolvedModelId(
  options: Readonly<{
    assistantClient: ReturnType<typeof useAui>;
    resolvedModelId: string;
  }>,
): void {
  useEffect(
    function registerResolvedModelIdWithAssistantUi() {
      // Returning the registration's unsubscribe prevents model switches and
      // remounts from accumulating providers in assistant-ui's registry.
      return options.assistantClient.modelContext().register({
        getModelContext: () => {
          return { config: { modelName: options.resolvedModelId } };
        },
      });
    },
    [options.assistantClient, options.resolvedModelId],
  );
}
