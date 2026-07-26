import { useQuery } from "@hooks";
import { prop } from "@utils";
import { ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOption";
import { APIClient } from "@/clients/APIClient";

type UseChatModelCatalogResult = {
  groups: ChatModelOption.OptionGroup[];
  models: ChatModelOption.T[];
  isLoading: boolean;
  isError: boolean;
};

/** Loads the OpenRouter model catalog via our chat edge function. */
export function useChatModelCatalog(): UseChatModelCatalogResult {
  const [groups = [], isLoading, queryResult] = useQuery({
    queryKey: ["chat", "models"],
    queryFn: async () => {
      const response = await APIClient.get({
        route: "chat/models",
        queryParams: { useCache: true },
      });
      return response.groups;
    },
    staleTime: Infinity,
  });

  const models = groups.flatMap(prop("models"));

  return {
    groups,
    models,
    isLoading,
    isError: queryResult.isError,
  };
}
