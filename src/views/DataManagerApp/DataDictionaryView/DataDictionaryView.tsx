import { where } from "@avandar/utils";
import { Center, Loader } from "@mantine/core";
import { useMemo } from "react";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
import { DataDictionaryCodeListClient } from "@/clients/dataDictionaries/DataDictionaryCodeListClient";
import { DataDictionaryEntryClient } from "@/clients/dataDictionaries/DataDictionaryEntryClient";
import { DataDictionaryEntryCodingClient } from "@/clients/dataDictionaries/DataDictionaryEntryCodingClient";
import { AppView } from "@/components/layouts/AppView/AppView";
import { DataDictionaryEditor } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryEditor/DataDictionaryEditor";
import type { ReactNode } from "react";

type Props = {
  dictionaryId: DataDictionary.Id;
};

/**
 * One dictionary: its entries, its code lists, and the datasets that use
 * it. Loads the dictionary and its contents, then hands the editor a draft.
 */
export function DataDictionaryView({
  dictionaryId,
}: Readonly<Props>): ReactNode {
  const [dictionary] = DataDictionaryClient.useGetById({ id: dictionaryId });
  const [entries] = DataDictionaryEntryClient.useGetAll(
    where("dictionary_id", "eq", dictionaryId),
  );
  const [codeLists] = DataDictionaryCodeListClient.useGetAll(
    where("dictionary_id", "eq", dictionaryId),
  );
  const [codings] = DataDictionaryEntryCodingClient.useGetAll(
    where("dictionary_id", "eq", dictionaryId),
  );
  const savedDraft = useMemo(() => {
    return entries && codeLists && codings
      ? DataDictionary.toDraft({ entries, codeLists, codings })
      : undefined;
  }, [entries, codeLists, codings]);

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
