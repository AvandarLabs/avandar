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

/**
 * What happens once a learned dictionary is saved: a toast, then Apply for
 * the first dataset with the dictionary picked, or the dictionary itself
 * when the user did not ask to apply it. Other datasets to apply it to are
 * named in the toast. Nothing navigates once the user has left the flow.
 * Used by `useCreateDictionary`.
 */
export function useOpenAfterCreate(): (
  dictionary: Readonly<{ id: DataDictionary.Id; name: string }>,
  applyNext: readonly ApplyTarget[],
) => void {
  const { t } = useLingui();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const isMountedRef = useIsMounted();
  return (dictionary, applyNext) => {
    const dictionaryName = dictionary.name;
    const [first, ...rest] = applyNext;
    const restNames = rest.map(prop("name")).join(", ");
    notifySuccess(
      !first
        ? t`Saved ${dictionaryName} to Dictionaries.`
        : rest.length === 0
          ? t`Saved ${dictionaryName} to Dictionaries. Now choose how to apply it.`
          : t`Saved ${dictionaryName} to Dictionaries. Apply it to ${restNames} too, from each dataset's menu.`,
    );
    if (!isMountedRef.current) {
      return;
    }
    navigate(
      first
        ? {
            ...AppLinks.dataManagerApplyDictionaries({
              workspaceSlug: workspace.slug,
              datasetId: first.datasetId,
            }),
            search: { dictionaryId: dictionary.id },
          }
        : AppLinks.dataManagerDictionaryView({
            workspaceSlug: workspace.slug,
            dictionaryId: dictionary.id,
            dictionaryName,
          }),
    );
  };
}
