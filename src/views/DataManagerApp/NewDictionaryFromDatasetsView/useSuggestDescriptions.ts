import { useLingui } from "@lingui/react/macro";
import { useEffect, useRef, useState } from "react";
import { parseDictionaryDescriptionSuggestion } from "$/agent/dictionarySuggestions/dictionarySuggestionsPrompt";
import { DictionarySuggestions } from "@/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions";
import { useIsMounted } from "@/lib/hooks/state/useIsMounted";
import { notifySuccess } from "@/utils/notifications/notify";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type {
  NewDictionaryAction,
  ProposalReadId,
} from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { RequestSuggestionReply } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions/useDictionarySuggestions";
import type { Dispatch, RefObject } from "react";

/** Where one entry's suggestion stands: asked and waiting, or not answered. */
export type DescriptionSuggestionStatus = "pending" | "failed";

/** How far a run of several entries has got. */
export type DescriptionSuggestionProgress = { done: number; total: number };

/** One run: the entries to ask about, and which may be rewritten. */
export type SuggestDescriptionsOptions = {
  entryKeys: readonly string[];
  /** The entries whose typed description the user agreed to have rewritten. */
  rewritableEntryKeys: readonly string[];
};

/** What the Describe columns step can do about suggesting descriptions. */
export type SuggestDescriptions = {
  suggestDescriptions: (options: SuggestDescriptionsOptions) => void;
  /** An entry's status while it is pending or after it failed. */
  statusByEntryKey: ReadonlyMap<string, DescriptionSuggestionStatus>;
  /** True for the length of a run, so no second run starts beside it. */
  isSuggesting: boolean;
  /** Set only while a run of several entries is going. */
  progress: DescriptionSuggestionProgress | undefined;
};

type SuggestOptions = Readonly<{
  proposal: DictionaryProposal.T | undefined;
  /** The proposal's read. Descriptions for another read are dropped. */
  readId: ProposalReadId | undefined;
  requestReply: RequestSuggestionReply;
  dispatch: Dispatch<NewDictionaryAction>;
}>;

type Latest = RefObject<SuggestOptions>;

/**
 * Asks for one entry's description. Undefined when the user did not let the
 * request go online. Reads the latest proposal, so the description sent is
 * the one in the box now, not the one when the run began.
 */
async function _requestDescription(
  options: Readonly<{ latest: Latest; entryKey: string; locale: string }>,
): Promise<string | undefined> {
  const { proposal, requestReply } = options.latest.current;
  const entry = proposal?.entries.find((current) => {
    return current.key === options.entryKey;
  });
  if (!entry) {
    throw new Error("The entry to describe no longer exists");
  }
  const reply = await requestReply(
    DictionarySuggestions.makeDescribeRequestFromEntry({
      entry,
      locale: options.locale,
    }),
  );
  if (reply === undefined) {
    return undefined;
  }
  const description = parseDictionaryDescriptionSuggestion(reply);
  if (description === undefined) {
    throw new Error("The suggestion reply could not be read");
  }
  return description;
}

/**
 * Asks the suggestion model for descriptions, one entry after another, and
 * fills each in as it arrives. One at a time keeps the first online send
 * from opening a consent prompt per entry, and keeps the offline model to
 * one request. A failure marks that entry and the run goes on. When the user
 * does not let a request go online, nothing is filled in and nothing is
 * marked: the step already says suggestions are off.
 */
export function useSuggestDescriptions(
  options: SuggestOptions,
): SuggestDescriptions {
  const { t, i18n } = useLingui();
  const isMountedRef = useIsMounted();
  const latestRef = useRef(options);
  useEffect(() => {
    latestRef.current = options;
  });
  const [statusByEntryKey, setStatusByEntryKey] = useState<
    ReadonlyMap<string, DescriptionSuggestionStatus>
  >(new Map());
  const [progress, setProgress] = useState<
    DescriptionSuggestionProgress | undefined
  >();
  const [isSuggesting, setIsSuggesting] = useState(false);
  const isRunningRef = useRef(false);

  function setStatus(
    entryKey: string,
    status: DescriptionSuggestionStatus | undefined,
  ): void {
    if (!isMountedRef.current) {
      return;
    }
    setStatusByEntryKey((current) => {
      const next = new Map(current);
      if (status) {
        next.set(entryKey, status);
      } else {
        next.delete(entryKey);
      }
      return next;
    });
  }

  async function suggestOne(
    entryKey: string,
    rewritableEntryKeys: readonly string[],
  ): Promise<boolean> {
    // Read once so a late reply still lands on the read it was asked for.
    const { readId, dispatch } = latestRef.current;
    setStatus(entryKey, "pending");
    try {
      const description = await _requestDescription({
        latest: latestRef,
        entryKey,
        locale: i18n.locale,
      });
      setStatus(entryKey, undefined);
      if (description === undefined) {
        return false;
      }
      dispatch({
        type: "descriptions_suggested",
        readId,
        suggestions: [{ entryKey, description }],
        rewritableEntryKeys,
      });
      return true;
    } catch {
      setStatus(entryKey, "failed");
      return false;
    }
  }

  async function run(request: SuggestDescriptionsOptions): Promise<void> {
    const { entryKeys } = request;
    const hasSeveral = entryKeys.length > 1;
    let filledCount = 0;
    for (const [index, entryKey] of entryKeys.entries()) {
      if (hasSeveral && isMountedRef.current) {
        setProgress({ done: index, total: entryKeys.length });
      }
      if (await suggestOne(entryKey, request.rewritableEntryKeys)) {
        filledCount += 1;
      }
    }
    if (isMountedRef.current) {
      setProgress(undefined);
      if (hasSeveral && filledCount > 0) {
        notifySuccess(
          t`Suggested descriptions filled in. Check them before saving.`,
        );
      }
    }
  }

  return {
    suggestDescriptions: (request) => {
      // A second run waits for the first, so it never races for consent.
      if (isRunningRef.current || request.entryKeys.length === 0) {
        return;
      }
      isRunningRef.current = true;
      setIsSuggesting(true);
      void run(request).finally(() => {
        isRunningRef.current = false;
        if (isMountedRef.current) {
          setIsSuggesting(false);
        }
      });
    },
    statusByEntryKey,
    isSuggesting,
    progress,
  };
}
