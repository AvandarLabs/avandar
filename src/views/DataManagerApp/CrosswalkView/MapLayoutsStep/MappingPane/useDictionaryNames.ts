import { where } from "@avandar/utils";
import { useMemo } from "react";
import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";

/** Every dictionary's name in the workspace, by dictionary id. */
export function useDictionaryNames(): ReadonlyMap<string, string> {
  const workspace = useCurrentWorkspace();
  const [dictionaries] = DataDictionaryClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  return useMemo(() => {
    return new Map(
      (dictionaries ?? []).map((dictionary) => {
        return [dictionary.id, dictionary.name] as const;
      }),
    );
  }, [dictionaries]);
}
