import { prop } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useIsMounted } from "@/lib/hooks/state/useIsMounted";
import { notifySuccess } from "@/utils/notifications/notify";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/** A dataset a new dictionary can be applied to once it is saved. */
export type ApplyTarget = { datasetId: Dataset.Id; name: string };

type SavedDictionary = Readonly<{ id: DataDictionary.Id; name: string }>;

/**
 * The toast shown once a learned dictionary is saved. It only mentions
 * applying the dictionary when Apply is about to open.
 */
function useSavedMessage(): (
  dictionaryName: string,
  applyTargets: readonly ApplyTarget[],
) => string {
  const { t, i18n } = useLingui();
  return (dictionaryName, applyTargets) => {
    const [firstTarget, ...otherTargets] = applyTargets;
    if (!firstTarget) {
      return t`Saved ${dictionaryName} to Dictionaries.`;
    }
    if (otherTargets.length === 0) {
      return t`Saved ${dictionaryName} to Dictionaries. Now choose how to apply it.`;
    }
    const otherNames = new Intl.ListFormat(i18n.locale, {
      type: "conjunction",
    }).format(otherTargets.map(prop("name")));
    return t`Saved ${dictionaryName} to Dictionaries. Apply it to ${otherNames} too, from each dataset's menu.`;
  };
}

/**
 * What happens once a learned dictionary is saved: a toast, then Apply for
 * the first dataset with the dictionary picked, or the dictionary itself
 * when the user did not ask to apply it. Other datasets to apply it to are
 * named in the toast. Once the user has left the flow, nothing navigates
 * and the toast only says the dictionary was saved.
 * Used by `useCreateDictionary`.
 */
export function useOpenAfterCreate(): (
  dictionary: SavedDictionary,
  applyNext: readonly ApplyTarget[],
) => void {
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const isMountedRef = useIsMounted();
  const getSavedMessage = useSavedMessage();
  return (dictionary, applyNext) => {
    if (!isMountedRef.current) {
      notifySuccess(getSavedMessage(dictionary.name, []));
      return;
    }
    notifySuccess(getSavedMessage(dictionary.name, applyNext));
    const [firstTarget] = applyNext;
    if (!firstTarget) {
      const link = AppLinks.dataManagerDictionaryView({
        workspaceSlug: workspace.slug,
        dictionaryId: dictionary.id,
        dictionaryName: dictionary.name,
      });
      navigate({ to: link.to, params: link.params });
      return;
    }
    const link = AppLinks.dataManagerApplyDictionaries({
      workspaceSlug: workspace.slug,
      datasetId: firstTarget.datasetId,
    });
    navigate({
      to: link.to,
      params: link.params,
      search: { dictionaryId: dictionary.id },
    });
  };
}
