import { formatDate } from "@avandar/utils";
import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { AppViewHeader } from "@/components/layouts/AppView/AppViewHeader/AppViewHeader";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { ApplyToDatasetButton } from "@/views/DataManagerApp/DataDictionaryView/ApplyToDatasetButton/ApplyToDatasetButton";
import { DataDictionaryActionsMenu } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryActionsMenu/DataDictionaryActionsMenu";
import { DataDictionaryNameField } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryHeader/DataDictionaryNameField";
import { useCanDeleteDictionary } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryHeader/useCanDeleteDictionary";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { ReactNode } from "react";

type Props = {
  dictionary: DataDictionary.T;
  draft: DataDictionary.Draft;
  canEdit: boolean;
  /**
   * How many datasets the user can see that use this dictionary, or
   * undefined while that is loading or could not be read.
   */
  usedByCount: number | undefined;
};

/** The dictionary's name, the facts that identify it, and its actions. */
export function DataDictionaryHeader({
  dictionary,
  draft,
  canEdit,
  usedByCount,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const entryCount = draft.entries.length;
  const codeListCount = draft.codeLists.length;
  const canDelete = useCanDeleteDictionary(dictionary);
  const canApply = useHasPermission("data_sources__can_edit_dataset");
  const canManage = canEdit && canDelete;
  const updatedDate = formatDate(dictionary.updatedAt, {
    format: "MMM D, YYYY",
  });

  return (
    <AppViewHeader
      title={
        canEdit ? (
          <DataDictionaryNameField dictionary={dictionary} />
        ) : (
          dictionary.name
        )
      }
      facts={[
        t`Dictionary`,
        plural(entryCount, { one: "# entry", other: "# entries" }),
        plural(codeListCount, { one: "# code list", other: "# code lists" }),
        usedByCount === undefined
          ? undefined
          : plural(usedByCount, {
              one: "Used by # dataset",
              other: "Used by # datasets",
            }),
        t`Version ${dictionary.version}`,
        t`Updated ${updatedDate}`,
      ]}
      actions={
        // An empty fragment would still render the header's actions group.
        canApply || canManage ? (
          <>
            {canApply ? <ApplyToDatasetButton dictionary={dictionary} /> : null}
            {canManage ? (
              <DataDictionaryActionsMenu dictionary={dictionary} />
            ) : null}
          </>
        ) : undefined
      }
    />
  );
}
