import { ReactRenderer } from "@tiptap/react";
import { isChatMentionType } from "$/agent/mentions/ChatMentionToken";
import { GADGET_TYPES } from "$/models/gadgets/Gadget/Gadget";
import { searchGadgets } from "@/clients/gadgets/searchGadgets/searchGadgets";
import { buildMentionMenuGroups } from "@/components/RichText/MentionMenu/buildMentionMenuGroups/buildMentionMenuGroups";
import { MentionMenuList } from "@/components/RichText/MentionMenu/MentionMenuList/MentionMenuList";
import { filterMentionCandidates } from "@/components/RichText/UserMention/filterMentionCandidates";
import type { GadgetSearchResult } from "@/clients/gadgets/searchGadgets/searchGadgets";
import type {
  MentionMenuListHandle,
  MentionMenuListProps,
  MentionMenuSelection,
  MentionMenuVariant,
} from "@/components/RichText/MentionMenu/MentionMenuList/MentionMenuList";
import type { MentionCandidate } from "@/components/RichText/UserMention/filterMentionCandidates";
import type { Editor, Range } from "@tiptap/core";
import type { MentionOptions } from "@tiptap/extension-mention";
import type { SuggestionProps } from "@tiptap/suggestion";

/** How long typing must pause before the gadget search runs. */
const GADGET_SEARCH_DEBOUNCE_MS = 150;

/**
 * The most rows the search returns for one gadget type. Mirrors
 * `type_position <= 5` in `supabase/schemas/50.rpc_gadgets__search.sql`.
 */
const GADGET_SEARCH_ROWS_PER_TYPE = 5;

/** Rows asked of the search: every type's rows, so none is cut off. */
const GADGET_SEARCH_LIMIT = GADGET_SEARCH_ROWS_PER_TYPE * GADGET_TYPES.length;

type GadgetSearchState = {
  gadgets: GadgetSearchResult[];
  isSearching: boolean;
  searchFailed: boolean;
};

const IDLE_SEARCH: GadgetSearchState = {
  gadgets: [],
  isSearching: false,
  searchFailed: false,
};

/**
 * The typed `@` query's range, plus the space right after it when there is
 * one, so the space an insert adds is not doubled. TipTap's own mention
 * command does the same.
 */
function _getQueryRangeWithSpace(editor: Editor, range: Range): Range {
  const nodeAfter = editor.view.state.selection.$to.nodeAfter;
  return nodeAfter?.text?.startsWith(" ")
    ? { from: range.from, to: range.to + 1 }
    : range;
}

/**
 * Inserts what the author chose, in place of the typed `@` query: a member
 * as a mention followed by a space, or a gadget as a link or an embed. An
 * embed that cannot go at the cursor is inserted as a link instead. The
 * chat variant always inserts a link.
 */
function _insertSelection(
  options: Readonly<{
    editor: Editor;
    range: Range;
    selection: MentionMenuSelection;
    variant: MentionMenuVariant;
  }>,
): void {
  const { editor, selection, variant } = options;
  const queryRange = _getQueryRangeWithSpace(editor, options.range);
  if (selection.kind === "person") {
    editor
      .chain()
      .focus()
      .insertContentAt(queryRange, [
        { type: "userMention", attrs: { id: selection.candidate.userId } },
        { type: "text", text: " " },
      ])
      .run();
    editor.view.dom.ownerDocument.defaultView?.getSelection()?.collapseToEnd();
    return;
  }
  const { ref } = selection.result;
  editor
    .chain()
    .focus()
    .deleteRange(queryRange)
    .command(({ commands }) => {
      return variant === "comment" && selection.display === "embed"
        ? commands.insertGadgetEmbed(ref) || commands.insertGadgetLink(ref)
        : commands.insertGadgetLink(ref);
    })
    .run();
}

/**
 * Runs one gadget search for `query` after the debounce pause, reporting
 * each state through `onChange`: searching at once, keeping `previous`
 * results on screen meanwhile, then the new results or a failure. Returns a
 * cancel function that aborts the request, after which nothing more is
 * reported.
 */
function _startGadgetSearch(
  options: Readonly<{
    workspaceId: string;
    query: string;
    previous: GadgetSearchState;
    onChange: (state: GadgetSearchState) => void;
  }>,
): () => void {
  const { workspaceId, query, onChange } = options;
  const controller = new AbortController();
  // A failed search carries no gadgets, so nothing stale comes back here.
  onChange({
    gadgets: options.previous.gadgets,
    isSearching: true,
    searchFailed: false,
  });
  const timeoutId = setTimeout(() => {
    void searchGadgets({
      workspaceId,
      query,
      limit: GADGET_SEARCH_LIMIT,
      signal: controller.signal,
    }).then(
      (gadgets) => {
        if (!controller.signal.aborted) {
          onChange({ gadgets, isSearching: false, searchFailed: false });
        }
      },
      () => {
        if (!controller.signal.aborted) {
          onChange({ gadgets: [], isSearching: false, searchFailed: true });
        }
      },
    );
  }, GADGET_SEARCH_DEBOUNCE_MS);
  return () => {
    controller.abort();
    clearTimeout(timeoutId);
  };
}

/** The search results the variant offers: the chat leaves out cases. */
function _filterGadgetsForVariant(
  gadgets: readonly GadgetSearchResult[],
  variant: MentionMenuVariant,
): readonly GadgetSearchResult[] {
  return variant === "chat"
    ? gadgets.filter((result) => {
        return isChatMentionType(result.ref.gadgetType);
      })
    : gadgets;
}

function _buildListProps(
  props: SuggestionProps<MentionCandidate>,
  search: GadgetSearchState,
  variant: MentionMenuVariant,
): MentionMenuListProps {
  return {
    variant,
    groups: buildMentionMenuGroups({
      gadgets: _filterGadgetsForVariant(search.gadgets, variant),
      people: props.items,
    }),
    isSearching: search.isSearching,
    searchFailed: search.searchFailed,
    clientRect: props.clientRect,
    command: (selection) => {
      _insertSelection({
        editor: props.editor,
        range: props.range,
        selection,
        variant,
      });
    },
    editingArea: props.editor.view.dom,
  };
}

/**
 * The gadget search behind the `@` menu. `restart` searches for a new query,
 * cancelling any search in flight, and does nothing when neither the query
 * nor the workspace changed (the caret only moved). Without a workspace it
 * reports idle. `cancel` aborts and forgets everything, for when the menu
 * closes.
 */
function _createGadgetSearchSession(
  getWorkspaceId: () => string | undefined,
  onChange: (state: GadgetSearchState) => void,
) {
  let state = IDLE_SEARCH;
  let lastSearch: { workspaceId?: string; query?: string } = {};
  let cancelSearch = () => {};
  const report = (nextState: GadgetSearchState) => {
    state = nextState;
    onChange(nextState);
  };
  return {
    getState: () => {
      return state;
    },
    restart: (query: string) => {
      const workspaceId = getWorkspaceId();
      if (
        workspaceId === lastSearch.workspaceId &&
        query === lastSearch.query
      ) {
        return;
      }
      lastSearch = { workspaceId, query };
      cancelSearch();
      cancelSearch = () => {};
      if (!workspaceId) {
        report(IDLE_SEARCH);
        return;
      }
      cancelSearch = _startGadgetSearch({
        workspaceId,
        query,
        previous: state,
        onChange: report,
      });
    },
    cancel: () => {
      cancelSearch();
      lastSearch = {};
      state = IDLE_SEARCH;
    },
  };
}

/**
 * Mounts the `@` menu while a query is open and keeps it in step with the
 * query: people filter at once, and gadgets reload through a debounced
 * search whenever a workspace is known.
 */
function _createMentionMenuRenderer(
  getWorkspaceId: () => string | undefined,
  variant: MentionMenuVariant,
) {
  let renderer:
    | ReactRenderer<MentionMenuListHandle, MentionMenuListProps>
    | undefined;
  let latestProps: SuggestionProps<MentionCandidate> | undefined;
  const rerender = () => {
    if (latestProps) {
      renderer?.updateProps(
        _buildListProps(latestProps, gadgetSearch.getState(), variant),
      );
    }
  };
  const gadgetSearch = _createGadgetSearchSession(getWorkspaceId, rerender);

  return {
    onStart: (props: SuggestionProps<MentionCandidate>) => {
      latestProps = props;
      renderer = new ReactRenderer(MentionMenuList, {
        props: _buildListProps(props, gadgetSearch.getState(), variant),
        editor: props.editor,
      });
      document.body.appendChild(renderer.element);
      gadgetSearch.restart(props.query);
    },
    onUpdate: (props: SuggestionProps<MentionCandidate>) => {
      latestProps = props;
      rerender();
      gadgetSearch.restart(props.query);
    },
    // The suggestion plugin closes the list on Escape itself, by calling
    // `onExit`, so only list navigation is forwarded here.
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      return renderer?.ref?.onKeyDown(event) ?? false;
    },
    onExit: () => {
      gadgetSearch.cancel();
      latestProps = undefined;
      renderer?.element.remove();
      renderer?.destroy();
      renderer = undefined;
    },
  };
}

/**
 * Suggestion options for the `@` menu. The default `comment` variant is the
 * comment composer's: workspace members and, when `getWorkspaceId` returns a
 * workspace, the gadgets the author can open there. The `chat` variant
 * offers no members and drops cases from the search, so it needs no
 * `getCandidates`. Both getters are read on every keystroke, so the menu
 * follows the latest members and workspace. Without a workspace the gadget
 * search never runs.
 */
export function createMentionMenuSuggestion(
  options: Readonly<{
    getCandidates?: () => readonly MentionCandidate[];
    getWorkspaceId: () => string | undefined;
    /** Defaults to `comment`. */
    variant?: MentionMenuVariant;
  }>,
): MentionOptions["suggestion"] {
  const variant = options.variant ?? "comment";
  return {
    char: "@",
    items: ({ query }) => {
      return variant === "chat"
        ? []
        : filterMentionCandidates(options.getCandidates?.() ?? [], query);
    },
    render: () => {
      return _createMentionMenuRenderer(options.getWorkspaceId, variant);
    },
  };
}
