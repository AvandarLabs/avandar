import { useQuery } from "@hooks";
import { flattenChatModelGroups } from "$/utils/chat/curateOpenRouterModels";
import { APIClient } from "@/clients/APIClient";
import type { ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOption";

type UseChatModelsResult = {
  groups: ChatModelOption.ChatModelOptionGroup[];
  models: ChatModelOption.T[];
  isLoading: boolean;
  isError: boolean;
};

/** Loads the OpenRouter model catalog via our chat edge function. */
export function useChatModels(): UseChatModelsResult {
  const [groups, isLoading, queryResult] = useQuery({
    queryKey: ["chat", "models"],
    queryFn: async () => {
      const response = await APIClient.get({
        route: "chat/models",
      });
      return response.groups;
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  const resolvedGroups = groups ?? [];
  const models = flattenChatModelGroups(resolvedGroups);

  return {
    groups: resolvedGroups,
    models,
    isLoading,
    isError: queryResult.isError,
  };
}
