import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
import { DataDictionaryCodeListClient } from "@/clients/dataDictionaries/DataDictionaryCodeListClient";
import { DataDictionaryEntryClient } from "@/clients/dataDictionaries/DataDictionaryEntryClient";
import { DataDictionaryEntryCodingClient } from "@/clients/dataDictionaries/DataDictionaryEntryCodingClient";
import { Logger } from "@/utils/Logger";
import { notifySuccess } from "@/utils/notifications/notify";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";

type SaveDataDictionary = {
  /**
   * Saves the payload. `sentDraft` is the draft the payload was built from,
   * handed back to `onSaved` so edits made while the save is in flight are
   * not marked as saved.
   */
  save: (
    payload: DataDictionary.SavePayload,
    sentDraft: DataDictionary.Draft,
  ) => void;
  isSaving: boolean;
  /** The last save's failure, until the next save. */
  saveError: unknown;
  /** Forgets the last save's failure. */
  resetSaveError: () => void;
};

/**
 * Saves a dictionary's contents in one call, then refreshes the dictionary
 * and its entries, code lists, and codings.
 *
 * A failure is logged, not toasted: the save bar shows it as translated
 * copy next to the Save button.
 *
 * @param options.onSaved Called after a save succeeds, before the refresh
 *   lands, with the draft that was sent so the editor can mark exactly that
 *   as saved.
 */
export function useSaveDataDictionary(
  options: Readonly<{ onSaved: (savedDraft: DataDictionary.Draft) => void }>,
): SaveDataDictionary {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const sentDraftRef = useRef<DataDictionary.Draft | undefined>(undefined);
  const [saveContents, isSaving, mutation] =
    DataDictionaryClient.useSaveContents({
      onSuccess: async () => {
        if (sentDraftRef.current) {
          options.onSaved(sentDraftRef.current);
        }
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
    save: (payload, sentDraft) => {
      sentDraftRef.current = sentDraft;
      saveContents(payload);
    },
    isSaving,
    saveError: mutation.error ?? undefined,
    resetSaveError: mutation.reset,
  };
}
