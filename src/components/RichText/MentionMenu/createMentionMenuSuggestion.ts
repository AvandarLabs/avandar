import { ReactRenderer } from "@tiptap/react";
import { searchGadgets } from "@/clients/gadgets/searchGadgets/searchGadgets";
import { buildMentionMenuGroups } from "@/components/RichText/MentionMenu/buildMentionMenuGroups/buildMentionMenuGroups";
import { MentionMenuList } from "@/components/RichText/MentionMenu/MentionMenuList/MentionMenuList";
import { filterMentionCandidates } from "@/components/RichText/UserMention/filterMentionCandidates";
import type { GadgetSearchResult } from "@/clients/gadgets/searchGadgets/searchGadgets";
import type {
  MentionMenuListHandle,
  MentionMenuListProps,
  MentionMenuSelection,
} from "@/components/RichText/MentionMenu/MentionMenuList/MentionMenuList";
import type { MentionCandidate } from "@/components/RichText/UserMention/filterMentionCandidates";
import type { Editor, Range } from "@tiptap/core";
import type { MentionOptions } from "@tiptap/extension-mention";
import type { SuggestionProps } from "@tiptap/suggestion";

/** How long typing must pause before the gadget search runs. */
const GADGET_SEARCH_DEBOUNCE_MS = 150;

/** Rows asked of the search. The menu still shows at most five per group. */
const GADGET_SEARCH_LIMIT = 20;

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
 * Inserts what the author chose, in place of the typed `@` query: a member
 * as a mention followed by a space, or a gadget as a link or an embed. An
 * embed that cannot go at the cursor is inserted as a link instead.
 */
function _insertSelection(
  options: Readonly<{
    editor: Editor;
    range: Range;
    selection: MentionMenuSelection;
  }>,
): void {
  const { editor, range, selection } = options;
  if (selection.kind === "person") {
    // Swallow a space already after the query, as TipTap's mention does.
    const nodeAfter = editor.view.state.selection.$to.nodeAfter;
    const to = nodeAfter?.text?.startsWith(" ") ? range.to + 1 : range.to;
    editor
      .chain()
      .focus()
      .insertContentAt({ from: range.from, to }, [
        { type: "userMention", attrs: { id: selection.candidate.userId } },
        { type: "text", text: " " },
      ])
      .run();
    editor.view.dom.ownerDocument.defaultView?.getSelection()?.collapseToEnd();
    return;
  }
  const { ref } = selection.result;
  const canEmbed =
    selection.display === "embed" &&
    editor.can().chain().deleteRange(range).insertGadgetEmbed(ref).run();
  const chain = editor.chain().focus().deleteRange(range);
  (canEmbed ? chain.insertGadgetEmbed(ref) : chain.insertGadgetLink(ref)).run();
}

/**
 * Runs one gadget search for `query` after the debounce pause, reporting
 * each state through `onChange`: searching at once, then the results or a
 * failure. Returns a cancel function, after which nothing more is reported.
 */
function _startGadgetSearch(
  options: Readonly<{
    workspaceId: string;
    query: string;
    onChange: (state: GadgetSearchState) => void;
  }>,
): () => void {
  const { workspaceId, query, onChange } = options;
  let isCancelled = false;
  onChange({ gadgets: [], isSearching: true, searchFailed: false });
  const timeoutId = setTimeout(() => {
    searchGadgets({ workspaceId, query, limit: GADGET_SEARCH_LIMIT }).then(
      (gadgets) => {
        if (!isCancelled) {
          onChange({ gadgets, isSearching: false, searchFailed: false });
        }
      },
      () => {
        if (!isCancelled) {
          onChange({ gadgets: [], isSearching: false, searchFailed: true });
        }
      },
    );
  }, GADGET_SEARCH_DEBOUNCE_MS);
  return () => {
    isCancelled = true;
    clearTimeout(timeoutId);
  };
}

function _buildListProps(
  props: SuggestionProps<MentionCandidate>,
  search: GadgetSearchState,
): MentionMenuListProps {
  return {
    groups: buildMentionMenuGroups({
      gadgets: search.gadgets,
      people: props.items,
    }),
    isSearching: search.isSearching,
    searchFailed: search.searchFailed,
    clientRect: props.clientRect,
    command: (selection) => {
      _insertSelection({ editor: props.editor, range: props.range, selection });
    },
    editingArea: props.editor.view.dom,
  };
}

/**
 * The gadget search behind one open `@` menu. `restart` cancels any search
 * in flight and starts one for the new query, or reports idle when no
 * workspace is known. `cancel` stops reporting, for when the menu closes.
 */
function _createGadgetSearchSession(
  getWorkspaceId: () => string | undefined,
  onChange: (state: GadgetSearchState) => void,
) {
  let cancelSearch = () => {};
  return {
    restart: (query: string) => {
      cancelSearch();
      const workspaceId = getWorkspaceId();
      if (workspaceId) {
        cancelSearch = _startGadgetSearch({ workspaceId, query, onChange });
      } else {
        onChange(IDLE_SEARCH);
      }
    },
    cancel: () => {
      cancelSearch();
    },
  };
}

/**
 * Mounts the `@` menu while a query is open and keeps it in step with the
 * query: people filter at once, and gadgets reload through a debounced
 * search whenever a workspace is known.
 */
function _createMentionMenuRenderer(getWorkspaceId: () => string | undefined) {
  let renderer:
    | ReactRenderer<MentionMenuListHandle, MentionMenuListProps>
    | undefined;
  let latestProps: SuggestionProps<MentionCandidate> | undefined;
  let search = IDLE_SEARCH;
  const gadgetSearch = _createGadgetSearchSession(getWorkspaceId, (state) => {
    search = state;
    if (latestProps) {
      renderer?.updateProps(_buildListProps(latestProps, search));
    }
  });

  return {
    onStart: (props: SuggestionProps<MentionCandidate>) => {
      latestProps = props;
      renderer = new ReactRenderer(MentionMenuList, {
        props: _buildListProps(props, search),
        editor: props.editor,
      });
      document.body.appendChild(renderer.element);
      gadgetSearch.restart(props.query);
    },
    onUpdate: (props: SuggestionProps<MentionCandidate>) => {
      latestProps = props;
      gadgetSearch.restart(props.query);
    },
    // The suggestion plugin closes the list on Escape itself, by calling
    // `onExit`, so only list navigation is forwarded here.
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      return renderer?.ref?.onKeyDown(event) ?? false;
    },
    onExit: () => {
      gadgetSearch.cancel();
      search = IDLE_SEARCH;
      latestProps = undefined;
      renderer?.element.remove();
      renderer?.destroy();
      renderer = undefined;
    },
  };
}

/**
 * Suggestion options for the comment composer's `@` menu, which offers
 * workspace members and, when `getWorkspaceId` returns a workspace, the
 * gadgets the author can open there. Both getters are read on every
 * keystroke, so the menu follows the latest members and workspace. Without
 * a workspace the gadget search never runs.
 */
export function createMentionMenuSuggestion(
  options: Readonly<{
    getCandidates: () => readonly MentionCandidate[];
    getWorkspaceId: () => string | undefined;
  }>,
): MentionOptions["suggestion"] {
  return {
    char: "@",
    items: ({ query }) => {
      return filterMentionCandidates(options.getCandidates(), query);
    },
    render: () => {
      return _createMentionMenuRenderer(options.getWorkspaceId);
    },
  };
}
