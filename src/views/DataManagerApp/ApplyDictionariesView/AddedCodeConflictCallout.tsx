import { Callout } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { IconAlertCircle } from "@tabler/icons-react";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { AddedCodeConflict } from "@/views/DataManagerApp/ApplyDictionariesView/applyInputs/applyInputs";
import type { ReactNode } from "react";

type Props = {
  /** The first conflict, or undefined when there is none. */
  conflict: AddedCodeConflict | undefined;
  codeLists: ReadonlyMap<string, DataDictionaryCodeList.T>;
};

/**
 * Says which code two values add to one list, and where to fix it: the
 * reason the Save step's and Attach step's button is disabled. Renders
 * nothing without a conflict.
 */
export function AddedCodeConflictCallout({
  conflict,
  codeLists,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  if (!conflict) {
    return null;
  }
  const { code } = conflict;
  const listName = codeLists.get(conflict.codeListId)?.name ?? "";
  return (
    <Callout
      maw={560}
      icon={<IconAlertCircle size={18} />}
      messageSize="sm"
      message={t`The source value ${code} is added twice to ${listName}. Change one of them on Unmatched values.`}
    />
  );
}
