import { formatDate } from "@avandar/utils";
import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { AppViewHeader } from "@/components/layouts/AppView/AppViewHeader/AppViewHeader";
import { DataDictionaryActionsMenu } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryActionsMenu/DataDictionaryActionsMenu";
import { DataDictionaryNameField } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryHeader/DataDictionaryNameField";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { ReactNode } from "react";

type Props = {
  dictionary: DataDictionary.T;
  draft: DataDictionary.Draft;
  canEdit: boolean;
};

/** The dictionary's name, the facts that identify it, and its actions. */
export function DataDictionaryHeader({
  dictionary,
  draft,
  canEdit,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const entryCount = draft.entries.length;
  const codeListCount = draft.codeLists.length;

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
        t`Version ${dictionary.version}`,
        t`Updated ${formatDate(dictionary.updatedAt, { format: "MMM D, YYYY" })}`,
      ]}
      actions={
        canEdit ? (
          <DataDictionaryActionsMenu dictionary={dictionary} />
        ) : undefined
      }
    />
  );
}
