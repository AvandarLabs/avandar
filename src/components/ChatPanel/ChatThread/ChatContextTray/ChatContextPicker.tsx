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
import { useEffect, useId, useState } from "react";
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
  isTrayFull,
  triggerRef,
}: TriggerProps): ReactNode {
  const { t } = useLingui();
  const reasonId = useId();
  const reason = t`You can attach up to ${MAX_ATTACHED_GADGETS} items.`;
  return (
    <Tooltip label={reason} disabled={!isTrayFull}>
      <span>
        <Combobox.Target withAriaAttributes={false}>
          <Button
            ref={triggerRef}
            variant="subtle"
            color="neutral"
            size="compact-xs"
            className={css.trigger}
            leftSection={<IconPlus size={12} aria-hidden />}
            aria-haspopup="listbox"
            aria-expanded={combobox.dropdownOpened}
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
};

/** "On this page" while the query is blank, then "Recent" or "Results". */
function ChatContextPickerGroups({
  listing,
  attachedKeys,
  hasQuery,
}: GroupsProps): ReactNode {
  const { t } = useLingui();
  const isAttached = (ref: Gadget.Ref): boolean => {
    return attachedKeys.has(ChatMentionToken.buildRefKey(ref));
  };
  return (
    <>
      {listing.pageRefs.length > 0 ? (
        <Combobox.Group label={t`On this page`}>
          {listing.pageRefs.map((ref) => {
            return (
              <ChatContextPickerPageOption
                key={ChatMentionToken.buildRefKey(ref)}
                gadgetRef={ref}
                isAttached={isAttached(ref)}
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
  query: string;
  setQuery: (query: string) => void;
  hasQuery: boolean;
  listing: PickerListing;
  search: ReturnType<typeof useChatContextSearch>;
};

/**
 * The picker's combobox, query, and what it lists. Closing it clears the
 * query, and the search runs only while it is open.
 */
function useChatContextPickerState(): PickerState {
  const [query, setQuery] = useState("");
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
  return { combobox, query, setQuery, hasQuery, listing, search };
}

type DropdownProps = {
  state: PickerState;
  attachedKeys: ReadonlySet<string>;
  onEscape: () => void;
};

/** The search box, the groups of choices, and the search's status. */
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
      <Combobox.Options aria-label={t`Add context`}>
        <ScrollArea.Autosize mah={OPTIONS_MAX_HEIGHT} type="scroll">
          <ChatContextPickerGroups
            listing={listing}
            attachedKeys={attachedKeys}
            hasQuery={state.hasQuery}
          />
          <ChatContextPickerSearchStatus
            isSearching={search.isSearching}
            searchFailed={search.searchFailed}
            hasResults={listing.results.length > 0}
            hasOtherOptions={listing.pageRefs.length > 0}
          />
        </ScrollArea.Autosize>
      </Combobox.Options>
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
