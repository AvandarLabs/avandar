import { Combobox, useCombobox } from "@mantine/core";
import { forwardRef, useId } from "react";
import { getMenuMaxHeight } from "@/components/RichText/MentionMenu/MentionMenuList/getMenuMaxHeight";
import { MentionMenuFooter } from "@/components/RichText/MentionMenu/MentionMenuList/MentionMenuFooter";
import { MentionMenuGroups } from "@/components/RichText/MentionMenu/MentionMenuList/MentionMenuGroups";
import classes from "@/components/RichText/MentionMenu/MentionMenuList/MentionMenuList.module.css";
import { MentionMenuSearchStatus } from "@/components/RichText/MentionMenu/MentionMenuList/MentionMenuSearchStatus";
import { useMentionMenuNavigation } from "@/components/RichText/MentionMenu/MentionMenuList/useMentionMenuNavigation";
import type { GadgetSearchResult } from "@/clients/gadgets/searchGadgets/searchGadgets";
import type { MentionMenuGroup } from "@/components/RichText/MentionMenu/buildMentionMenuGroups/buildMentionMenuGroups";
import type { MentionCandidate } from "@/components/RichText/UserMention/filterMentionCandidates";

/** Space kept between the menu and the window's edge. */
const MENU_VIEWPORT_PADDING = 8;

/** Lets the suggestion plugin forward the editor's key presses. */
export type MentionMenuListHandle = {
  onKeyDown: (event: KeyboardEvent) => boolean;
};

/**
 * What the author chose in the `@` menu: a member to mention, or a gadget to
 * insert as an inline link or as an embed on its own line.
 */
export type MentionMenuSelection =
  | { kind: "person"; candidate: MentionCandidate }
  | { kind: "gadget"; display: "link" | "embed"; result: GadgetSearchResult };

/**
 * Where the menu runs. `comment` offers members and every gadget, inserted
 * as a link or an embed. `chat` offers the chat's gadget types as links
 * only, with no audience warning, because only the user sees their chat.
 */
export type MentionMenuVariant = "comment" | "chat";

/** The props `createMentionMenuSuggestion` renders the list with. */
export type MentionMenuListProps = {
  /** Defaults to `comment`. */
  variant?: MentionMenuVariant;

  groups: readonly MentionMenuGroup[];

  /**
   * A gadget search is in flight. Gadgets from the last search stay shown
   * meanwhile, or a searching row shows when there are none.
   */
  isSearching: boolean;

  /** The gadget search failed, so a retry message replaces the gadgets. */
  searchFailed: boolean;
  clientRect: (() => DOMRect | null) | null | undefined;
  command: (selection: MentionMenuSelection) => void;

  /**
   * The editor's editing area. While the list is mounted it becomes an ARIA
   * combobox that controls the list and points at the highlighted row.
   */
  editingArea?: HTMLElement;
};

/**
 * The `@` menu: gadgets the author can open, grouped by type, then the
 * workspace members who match. The editor keeps focus, so keyboard
 * navigation arrives through `onKeyDown` from the suggestion plugin rather
 * than from the DOM.
 */
export const MentionMenuList = forwardRef<
  MentionMenuListHandle,
  MentionMenuListProps
>(function MentionMenuList(props, ref) {
  const listboxId = useId();
  // Always open while mounted: the suggestion plugin mounts and unmounts
  // the list as the `@` query starts and ends.
  const combobox = useCombobox({ opened: true });
  const { visibleGroups, highlightedItem, buildOptionId, chooseItemById } =
    useMentionMenuNavigation(ref, { ...props, listboxId });
  const rect = props.clientRect?.() ?? null;
  const hasGadgetGroups = visibleGroups.some((group) => {
    return group.key !== "people";
  });

  return (
    // The anchor spans the caret's line, so the menu opens below the line or,
    // when flipped, above it without covering what was typed.
    <div
      className={classes.anchor}
      style={{
        left: rect?.left ?? 0,
        top: rect?.top ?? 0,
        blockSize: rect?.height ?? 0,
      }}
    >
      <Combobox
        store={combobox}
        position="bottom-start"
        width={300}
        withinPortal
        // Mantine hands floating-ui's autoUpdate to the popover only when
        // it is not kept mounted. Its fallback effect misses a list that is
        // open from mount, so the position would be computed once, while the
        // menu is still small, and never flip or resize as results arrive.
        keepMounted={false}
        // The anchor is a zero-width line at the caret, which floating-ui
        // can report as detached. The list must show whenever it is mounted.
        hideDetached={false}
        // Near the bottom of the window the menu flips above the caret, and
        // `size` caps its height to the room left so the groups scroll
        // while the status row and footer stay visible.
        middlewares={{
          flip: true,
          shift: true,
          size: {
            padding: MENU_VIEWPORT_PADDING,
            apply: ({ availableHeight, elements, placement }) => {
              elements.floating.style.maxHeight = `${getMenuMaxHeight({
                placement,
                availableHeight,
                referenceRect: elements.reference.getBoundingClientRect(),
                viewportHeight: window.innerHeight,
                padding: MENU_VIEWPORT_PADDING,
              })}px`;
            },
          },
        }}
        onOptionSubmit={chooseItemById}
      >
        <Combobox.Target>
          <div className={classes.target} />
        </Combobox.Target>
        <Combobox.Dropdown className={classes.dropdown}>
          <MentionMenuSearchStatus
            isSearching={props.isSearching}
            searchFailed={props.searchFailed}
            hasGadgetGroups={hasGadgetGroups}
          />
          <MentionMenuGroups
            listboxId={listboxId}
            groups={visibleGroups}
            isSearching={props.isSearching}
            hasSearchStatus={props.isSearching || props.searchFailed}
            highlightedItemId={highlightedItem?.id}
            buildOptionId={buildOptionId}
          />
          {highlightedItem?.kind === "gadget" ? (
            <MentionMenuFooter
              result={highlightedItem.result}
              variant={props.variant}
            />
          ) : null}
        </Combobox.Dropdown>
      </Combobox>
    </div>
  );
});
