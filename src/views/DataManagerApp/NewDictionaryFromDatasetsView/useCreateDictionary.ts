import { useMutation } from "@avandar/query-hooks";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { notifyError } from "@/utils/notifications/notify";
import { useDictionaryCopy } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryCopy";
import {
  createDictionaryFromDraft,
  DictionaryLeftBehindError,
} from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/createDictionaryFromDraft/createDictionaryFromDraft";
import { useOpenAfterCreate } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useOpenAfterCreate";
import type { ApplyTarget } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useOpenAfterCreate";

/** What the Save step hands over to create a dictionary. */
export type CreateDictionaryVariables = Omit<
  Parameters<typeof createDictionaryFromDraft>[0],
  "workspaceId"
> & {
  /**
   * The datasets to apply the dictionary to once saved. The first opens
   * next and the rest are named in the toast. Empty opens the dictionary.
   */
  applyNext: readonly ApplyTarget[];
};

/**
 * Creates the dictionary a proposal describes, then opens Apply for it or
 * the dictionary itself (`useOpenAfterCreate`). A refusal is explained with
 * the same copy as a save on the Dictionary view, and the create flow keeps
 * its state so the user can retry. The dictionaries list is refreshed after
 * a failure too, because a failed save can leave an empty dictionary in it.
 */
export function useCreateDictionary(): [
  create: (variables: CreateDictionaryVariables) => void,
  isCreating: boolean,
] {
  const workspace = useCurrentWorkspace();
  const { t } = useLingui();
  const copy = useDictionaryCopy();
  const queryClient = useQueryClient();
  const openAfterCreate = useOpenAfterCreate();
  const [create, isCreating] = useMutation({
    mutationFn: ({
      applyNext: _applyNext,
      ...variables
    }: CreateDictionaryVariables) => {
      return createDictionaryFromDraft({
        ...variables,
        workspaceId: workspace.id,
      });
    },
    queryToInvalidate: DataDictionaryClient.QueryKeys.getAll(),
    onSuccess: (dictionary, variables) => {
      openAfterCreate(dictionary, variables.applyNext);
    },
    onError: (error) => {
      queryClient.invalidateQueries({
        queryKey: DataDictionaryClient.QueryKeys.getAll(),
      });
      if (error instanceof DictionaryLeftBehindError) {
        const { dictionaryName } = error;
        notifyError(
          t`The dictionary was not saved, and an empty dictionary named ${dictionaryName} was left in Dictionaries. Delete it before trying again.`,
        );
        return;
      }
      notifyError(copy.describeSaveError(error));
    },
  });
  return [create, isCreating];
}
