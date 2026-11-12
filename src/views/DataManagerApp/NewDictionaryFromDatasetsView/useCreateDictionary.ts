import { useMutation } from "@avandar/query-hooks";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useIsMounted } from "@/lib/hooks/state/useIsMounted";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { useDictionaryCopy } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryCopy";
import {
  createDictionaryFromDraft,
  DictionaryLeftBehindError,
} from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/createDictionaryFromDraft/createDictionaryFromDraft";

/** What the Save step hands over to create a dictionary. */
export type CreateDictionaryVariables = Omit<
  Parameters<typeof createDictionaryFromDraft>[0],
  "workspaceId"
>;

/**
 * Creates the dictionary a proposal describes and opens it, unless the user
 * has already left the create flow. A refusal is explained with the same
 * copy as a save on the Dictionary view, and the create flow keeps its state
 * so the user can retry. The dictionaries list is refreshed after a failure
 * too, because a failed save can leave an empty dictionary in it.
 */
export function useCreateDictionary(): [
  create: (variables: CreateDictionaryVariables) => void,
  isCreating: boolean,
] {
  const workspace = useCurrentWorkspace();
  const navigate = useNavigate();
  const { t } = useLingui();
  const copy = useDictionaryCopy();
  const queryClient = useQueryClient();
  const isMountedRef = useIsMounted();
  const [create, isCreating] = useMutation({
    mutationFn: (variables: CreateDictionaryVariables) => {
      return createDictionaryFromDraft({
        ...variables,
        workspaceId: workspace.id,
      });
    },
    queryToInvalidate: DataDictionaryClient.QueryKeys.getAll(),
    onSuccess: (dictionary) => {
      const dictionaryName = dictionary.name;
      notifySuccess(t`Saved ${dictionaryName} to Dictionaries.`);
      const link = AppLinks.dataManagerDictionaryView({
        workspaceSlug: workspace.slug,
        dictionaryId: dictionary.id,
        dictionaryName,
      });
      if (isMountedRef.current) {
        navigate({ to: link.to, params: link.params });
      }
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
