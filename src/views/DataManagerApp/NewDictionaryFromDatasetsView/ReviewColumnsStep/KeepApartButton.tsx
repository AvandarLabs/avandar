import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  entry: DictionaryProposal.Entry;
  dispatch: Dispatch<NewDictionaryAction>;
};

/**
 * Undoes a guessed merge by splitting the entry back into one entry per
 * column. Not shown for an entry nothing was guessed about.
 */
export function KeepApartButton({
  entry,
  dispatch,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const entryName = entry.name;
  if (entry.suggestedColumns.length === 0) {
    return null;
  }
  return (
    <Button
      variant="subtle"
      color="neutral"
      size="compact-xs"
      aria-label={t`Keep apart: ${entryName}`}
      onClick={() => {
        dispatch({ type: "keep_apart", entryKey: entry.key });
      }}
    >
      <Trans>Keep apart</Trans>
    </Button>
  );
}
