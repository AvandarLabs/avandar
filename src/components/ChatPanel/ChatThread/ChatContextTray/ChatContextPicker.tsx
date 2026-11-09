import { Tooltip } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  Button,
  Combobox,
  ScrollArea,
  useCombobox,
  VisuallyHidden,
} from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useCallback, useEffect, useId, useState } from "react";
import { MAX_ATTACHED_GADGETS } from "$/agent/mentions/AgentGadgetContext";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import {
  ChatContextPickerPageOption,
  ChatContextPickerResultOption,
  ChatContextPickerSearchStatus,
} from "@/components/ChatPanel/ChatThread/ChatContextTray/ChatContextPickerOptions";
import { useChatContextPageRefs } from "@/components/ChatPanel/ChatThread/ChatContextTray/useChatContextPageRefs";
import { useChatContextSearch } from "@/components/ChatPanel/ChatThread/ChatContextTray/useChatContextSearch";
import css from "./ChatContextTray.module.css";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { GadgetSearchResult } from "@/clients/gadgets/searchGadgets/searchGadgets";
import type { ComboboxStore } from "@mantine/core";
import type { ReactNode, RefObject } from "react";

/** How tall the list of choices grows before it scrolls. */
const OPTIONS_MAX_HEIGHT = 320;

/** The dropdown is wider than the button, to fit a name and its detail. */
const PICKER_WIDTH = 320;

type Props = {
  /** The "Add context" button, for the tray to return focus to it. */
  triggerRef: RefObject<HTMLButtonElement | null>;
};

type PickerListing = {
  pageRefs: readonly Gadget.Ref[];
  results: readonly GadgetSearchResult[];
  refsByKey: ReadonlyMap<string, Gadget.Ref>;
};

/**
 * What the picker lists: this page's gadgets while the query is blank, then
 * the search results without those page gadgets, and every listed ref by
 * its option value.
 */
function _buildListing(
  options: Readonly<{
    hasQuery: boolean;
    pageRefs: readonly Gadget.Ref[];
    results: readonly GadgetSearchResult[];
  }>,
): PickerListing {
  const pageRefs = options.hasQuery ? [] : options.pageRefs;
  const pageKeys = new Set(pageRefs.map(ChatMentionToken.buildRefKey));
  const results = options.results.filter((result) => {
    return !pageKeys.has(ChatMentionToken.buildRefKey(result.ref));
  });
  const listedRefs = [
    ...pageRefs,
    ...results.map((result) => {
      return result.ref;
    }),
  ];
  const refsByKey = new Map(
    listedRefs.map((ref) => {
      return [ChatMentionToken.buildRefKey(ref), ref] as const;
    }),
  );
  return { pageRefs, results, refsByKey };
}

type TriggerProps = {
  combobox: ComboboxStore;

  /** The id of the list of choices, which the button controls. */
  listId: string;
  isTrayFull: boolean;
  triggerRef: Props["triggerRef"];
};

/**
 * The "Add context" button. At the tray's limit it stays focusable but
 * marked disabled, so the tooltip and the screen reader can give the reason.
 * The tooltip sits on a wrapper, since the button's own handlers belong to
 * the combobox.
 */
function ChatContextPickerTrigger({
  combobox,
  listId,
  isTrayFull,
  triggerRef,
}: TriggerProps): ReactNode {
  const { t } = useLingui();
  const reasonId = useId();
  const reason = t`You can attach up to ${MAX_ATTACHED_GADGETS} items.`;
  return (
    <Tooltip label={reason} disabled={!isTrayFull}>
      <span>
        {/* Without keyboard handling here, the arrows cannot open a full
            tray's list. The search box handles the keys once it is open. */}
        <Combobox.Target
          withAriaAttributes={false}
          withKeyboardNavigation={!isTrayFull}
        >
          <Button
            ref={triggerRef}
            variant="subtle"
            color="neutral"
            size="compact-xs"
            className={css.trigger}
            leftSection={<IconPlus size={12} aria-hidden />}
            aria-haspopup="listbox"
            aria-expanded={combobox.dropdownOpened}
            aria-controls={combobox.dropdownOpened ? listId : undefined}
            aria-disabled={isTrayFull || undefined}
            data-disabled={isTrayFull || undefined}
            aria-describedby={isTrayFull ? reasonId : undefined}
            onClick={(event) => {
              if (isTrayFull) {
                event.preventDefault();
                return;
              }
              combobox.toggleDropdown();
            }}
          >
            <Trans>Add context</Trans>
          </Button>
        </Combobox.Target>
        {isTrayFull ? (
          <VisuallyHidden id={reasonId}>{reason}</VisuallyHidden>
        ) : null}
      </span>
    </Tooltip>
  );
}

type GroupsProps = {
  listing: PickerListing;
  attachedKeys: ReadonlySet<string>;
  hasQuery: boolean;

  /** False when every page item is one the user cannot open. */
  hasOpenablePageRefs: boolean;
  onPageRefLockedChange: (key: string, isLocked: boolean) => void;
};

/** "On this page" while the query is blank, then "Recent" or "Results". */
function ChatContextPickerGroups({
  listing,
  attachedKeys,
  hasQuery,
  hasOpenablePageRefs,
  onPageRefLockedChange,
}: GroupsProps): ReactNode {
  const { t } = useLingui();
  const isAttached = (ref: Gadget.Ref): boolean => {
    return attachedKeys.has(ChatMentionToken.buildRefKey(ref));
  };
  return (
    <>
      {listing.pageRefs.length > 0 ? (
        // Hidden rather than removed, so its items keep loading their names.
        <Combobox.Group label={t`On this page`} hidden={!hasOpenablePageRefs}>
          {listing.pageRefs.map((ref) => {
            return (
              <ChatContextPickerPageOption
                key={ChatMentionToken.buildRefKey(ref)}
                gadgetRef={ref}
                isAttached={isAttached(ref)}
                onLockedChange={onPageRefLockedChange}
              />
            );
          })}
        </Combobox.Group>
      ) : null}
      {listing.results.length > 0 ? (
        <Combobox.Group label={hasQuery ? t`Results` : t`Recent`}>
          {listing.results.map((result) => {
            return (
              <ChatContextPickerResultOption
                key={ChatMentionToken.buildRefKey(result.ref)}
                result={result}
                isAttached={isAttached(result.ref)}
              />
            );
          })}
        </Combobox.Group>
      ) : null}
    </>
  );
}

type PickerState = {
  combobox: ComboboxStore;

  /** Set on the list of choices, so the button can point at it. */
  listId: string;

  /** Whether any listed page item is one the user can open. */
  hasOpenablePageRefs: boolean;
  setPageRefLocked: (key: string, isLocked: boolean) => void;
  query: string;
  setQuery: (query: string) => void;
  hasQuery: boolean;
  listing: PickerListing;
  search: ReturnType<typeof useChatContextSearch>;
};

/**
 * Which listed page items turned out to be ones the user cannot open, as
 * each item reports once its summary loads, so the picker can hide the
 * page group when none is left.
 */
function useLockedPageRefs(
  pageRefs: readonly Gadget.Ref[],
): Pick<PickerState, "hasOpenablePageRefs" | "setPageRefLocked"> {
  const [lockedKeys, setLockedKeys] = useState<ReadonlySet<string>>(() => {
    return new Set();
  });
  const setPageRefLocked = useCallback((key: string, isLocked: boolean) => {
    setLockedKeys((current) => {
      if (current.has(key) === isLocked) {
        return current;
      }
      const updated = new Set(current);
      if (isLocked) {
        updated.add(key);
      } else {
        updated.delete(key);
      }
      return updated;
    });
  }, []);
  const hasOpenablePageRefs = pageRefs.some((ref) => {
    return !lockedKeys.has(ChatMentionToken.buildRefKey(ref));
  });
  return { hasOpenablePageRefs, setPageRefLocked };
}

/**
 * The picker's combobox, query, and what it lists. Closing it clears the
 * query, and the search runs only while it is open.
 */
function useChatContextPickerState(): PickerState {
  const [query, setQuery] = useState("");
  const listId = useId();
  const combobox = useCombobox({
    onDropdownOpen: () => {
      combobox.focusSearchInput();
    },
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setQuery("");
    },
  });
  const pageRefs = useChatContextPageRefs();
  const search = useChatContextSearch(query, {
    isEnabled: combobox.dropdownOpened,
  });
  const hasQuery = query.trim() !== "";
  const listing = _buildListing({
    hasQuery,
    pageRefs,
    results: search.results,
  });
  useEffect(
    function keepHighlightInRange() {
      combobox.updateSelectedOptionIndex();
    },
    [combobox, search.results, hasQuery],
  );
  const lockedPageRefs = useLockedPageRefs(listing.pageRefs);
  return {
    combobox,
    listId,
    query,
    setQuery,
    hasQuery,
    listing,
    search,
    ...lockedPageRefs,
  };
}

type DropdownProps = {
  state: PickerState;
  attachedKeys: ReadonlySet<string>;
  onEscape: () => void;
};

/**
 * The search box, the groups of choices, and after the list, the search's
 * status, kept out of the listbox so it holds only groups and options.
 */
function ChatContextPickerDropdown({
  state,
  attachedKeys,
  onEscape,
}: DropdownProps): ReactNode {
  const { t } = useLingui();
  const { listing, search } = state;
  return (
    <Combobox.Dropdown>
      <Combobox.Search
        value={state.query}
        placeholder={t`Search dashboards, datasets, maps...`}
        aria-label={t`Search dashboards, datasets, maps...`}
        onChange={(event) => {
          state.setQuery(event.currentTarget.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onEscape();
          }
        }}
      />
      <Combobox.Options id={state.listId} aria-label={t`Add context`}>
        <ScrollArea.Autosize mah={OPTIONS_MAX_HEIGHT} type="scroll">
          <ChatContextPickerGroups
            listing={listing}
            attachedKeys={attachedKeys}
            hasQuery={state.hasQuery}
            hasOpenablePageRefs={state.hasOpenablePageRefs}
            onPageRefLockedChange={state.setPageRefLocked}
          />
        </ScrollArea.Autosize>
      </Combobox.Options>
      <ChatContextPickerSearchStatus
        isSearching={search.isSearching}
        searchFailed={search.searchFailed}
        hasResults={listing.results.length > 0}
        hasOtherOptions={state.hasOpenablePageRefs}
      />
    </Combobox.Dropdown>
  );
}

/**
 * "Add context": a button that opens a searchable list of the chat's gadget
 * types (never a case), with this page's gadgets first while the search is
 * blank. Picking one attaches it to the chat and closes the list; an item
 * already attached is shown as "Added" and cannot be picked again.
 */
export function ChatContextPicker({ triggerRef }: Props): ReactNode {
  const { contextTray } = ChatPanelStateManager.useState();
  const dispatch = ChatPanelStateManager.useDispatch();
  const state = useChatContextPickerState();
  const { combobox, listing } = state;
  const closeAndFocusTrigger = (): void => {
    combobox.closeDropdown();
    triggerRef.current?.focus();
  };

  return (
    <Combobox
      store={combobox}
      position="top-start"
      width={PICKER_WIDTH}
      onOptionSubmit={(value) => {
        const ref = listing.refsByKey.get(value);
        if (ref) {
          dispatch.addToContextTray(ref);
        }
        closeAndFocusTrigger();
      }}
    >
      <ChatContextPickerTrigger
        combobox={combobox}
        listId={state.listId}
        isTrayFull={contextTray.length >= MAX_ATTACHED_GADGETS}
        triggerRef={triggerRef}
      />
      <ChatContextPickerDropdown
        state={state}
        attachedKeys={new Set(contextTray.map(ChatMentionToken.buildRefKey))}
        onEscape={closeAndFocusTrigger}
      />
    </Combobox>
  );
}
