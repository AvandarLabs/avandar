import { Callout } from "@avandar/ui";
import { where } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Center, Loader } from "@mantine/core";
import { useMemo } from "react";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
import { DataDictionaryCodeListClient } from "@/clients/dataDictionaries/DataDictionaryCodeListClient";
import { DataDictionaryEntryClient } from "@/clients/dataDictionaries/DataDictionaryEntryClient";
import { DataDictionaryEntryCodingClient } from "@/clients/dataDictionaries/DataDictionaryEntryCodingClient";
import { AppView } from "@/components/layouts/AppView/AppView";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { DataDictionaryEditor } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryEditor/DataDictionaryEditor";
import type { ReactNode } from "react";

type Props = {
  dictionaryId: DataDictionary.Id;
};

type DictionaryContents = {
  dictionary: DataDictionary.T | undefined;
  savedDraft: DataDictionary.Draft | undefined;
  hasLoadFailed: boolean;
};

const REFETCH = { useQueryOptions: ALWAYS_REFETCH_ON_MOUNT };

/**
 * Loads a dictionary with its entries, code lists, and codings. Every query
 * refetches on mount: the persisted cache can hold a snapshot from before the
 * last save, and whole-set saves built on it would undo that save.
 */
function useDictionaryContents(
  dictionaryId: DataDictionary.Id,
): DictionaryContents {
  const [dictionary, , dictionaryQuery] = DataDictionaryClient.useGetById({
    id: dictionaryId,
    useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
  });
  const [entries, , entriesQuery] = DataDictionaryEntryClient.useGetAll({
    ...where("dictionary_id", "eq", dictionaryId),
    ...REFETCH,
  });
  const [codeLists, , codeListsQuery] = DataDictionaryCodeListClient.useGetAll({
    ...where("dictionary_id", "eq", dictionaryId),
    ...REFETCH,
  });
  const [codings, , codingsQuery] = DataDictionaryEntryCodingClient.useGetAll({
    ...where("dictionary_id", "eq", dictionaryId),
    ...REFETCH,
  });
  const savedDraft = useMemo(() => {
    return entries && codeLists && codings
      ? DataDictionary.toDraft({ entries, codeLists, codings })
      : undefined;
  }, [entries, codeLists, codings]);

  // Only a failed first load counts. A background refetch that fails after
  // the data loaded must not unmount the editor and lose the draft.
  const hasLoadFailed = [
    dictionaryQuery,
    entriesQuery,
    codeListsQuery,
    codingsQuery,
  ].some((query) => {
    return query.isLoadingError;
  });
  return { dictionary, savedDraft, hasLoadFailed };
}

/**
 * One dictionary: its entries, its code lists, and the datasets that use
 * it. Loads the dictionary and its contents, then hands the editor a draft.
 */
export function DataDictionaryView({
  dictionaryId,
}: Readonly<Props>): ReactNode {
  const { dictionary, savedDraft, hasLoadFailed } =
    useDictionaryContents(dictionaryId);

  if (hasLoadFailed) {
    return <DataDictionaryLoadFailed />;
  }
  if (!dictionary || !savedDraft) {
    return (
      <AppView>
        <Center flex={1}>
          <Loader size="sm" />
        </Center>
      </AppView>
    );
  }
  return (
    <DataDictionaryEditor
      key={dictionary.id}
      dictionary={dictionary}
      savedDraft={savedDraft}
    />
  );
}

function DataDictionaryLoadFailed(): ReactNode {
  const { t } = useLingui();
  return (
    <AppView>
      <Center flex={1} p="lg">
        <Callout
          maw={520}
          title={t`Dictionary failed to load`}
          message={t`The dictionary failed to load. Please try again later or reach out to support.`}
        />
      </Center>
    </AppView>
  );
}
