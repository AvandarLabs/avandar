import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
import { DataDictionaryCodeListClient } from "@/clients/dataDictionaries/DataDictionaryCodeListClient";
import { DataDictionaryEntryClient } from "@/clients/dataDictionaries/DataDictionaryEntryClient";
import { DataDictionaryEntryCodingClient } from "@/clients/dataDictionaries/DataDictionaryEntryCodingClient";
import { Logger } from "@/utils/Logger";
import { notifySuccess } from "@/utils/notifications/notify";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";

type SaveDataDictionary = {
  save: (payload: DataDictionary.SavePayload) => void;
  isSaving: boolean;
  /** The last save's failure, until the next save. */
  saveError: unknown;
};

/**
 * Saves a dictionary's contents in one call, then refreshes the dictionary
 * and its entries, code lists, and codings.
 *
 * A failure is logged, not toasted: the save bar shows it as translated
 * copy next to the Save button.
 *
 * @param options.onSaved Called after a save succeeds, before the refresh
 *   lands, so the editor can mark what it sent as saved.
 */
export function useSaveDataDictionary(
  options: Readonly<{ onSaved: () => void }>,
): SaveDataDictionary {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [saveContents, isSaving, mutation] =
    DataDictionaryClient.useSaveContents({
      onSuccess: async () => {
        options.onSaved();
        await Promise.all(
          [
            DataDictionaryClient,
            DataDictionaryEntryClient,
            DataDictionaryCodeListClient,
            DataDictionaryEntryCodingClient,
          ].map((client) => {
            return queryClient.invalidateQueries({
              queryKey: [client.getClientName()],
            });
          }),
        );
        notifySuccess(t`Dictionary saved`);
      },
      onError: (error) => {
        Logger.error(error, { devMsg: "Saving dictionary contents failed" });
      },
    });

  return {
    save: saveContents,
    isSaving,
    saveError: mutation.error ?? undefined,
  };
}
