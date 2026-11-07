import { Combobox, useCombobox } from "@mantine/core";
import { forwardRef, useId } from "react";
import { MentionMenuFooter } from "@/components/RichText/MentionMenu/MentionMenuList/MentionMenuFooter";
import { MentionMenuGroups } from "@/components/RichText/MentionMenu/MentionMenuList/MentionMenuGroups";
import classes from "@/components/RichText/MentionMenu/MentionMenuList/MentionMenuList.module.css";
import { MentionMenuSearchStatus } from "@/components/RichText/MentionMenu/MentionMenuList/MentionMenuSearchStatus";
import { useMentionMenuNavigation } from "@/components/RichText/MentionMenu/MentionMenuList/useMentionMenuNavigation";
import type { GadgetSearchResult } from "@/clients/gadgets/searchGadgets/searchGadgets";
import type { MentionMenuGroup } from "@/components/RichText/MentionMenu/buildMentionMenuGroups/buildMentionMenuGroups";
import type { MentionCandidate } from "@/components/RichText/UserMention/filterMentionCandidates";

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

/** The props `createMentionMenuSuggestion` renders the list with. */
export type MentionMenuListProps = {
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
    <div
      className={classes.anchor}
      style={{ left: rect?.left ?? 0, top: rect?.bottom ?? 0 }}
    >
      <Combobox
        store={combobox}
        position="bottom-start"
        width={300}
        withinPortal
        // The anchor is a zero-size point at the caret, which floating-ui
        // can report as detached. The list must show whenever it is mounted.
        hideDetached={false}
        // Near the bottom of the window the menu flips above the caret, and
        // `size` caps its height to the room left so the groups scroll
        // while the status row and footer stay visible.
        middlewares={{ flip: true, shift: true, size: { padding: 8 } }}
        onOptionSubmit={chooseItemById}
      >
        <Combobox.Target>
          <div />
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
            <MentionMenuFooter result={highlightedItem.result} />
          ) : null}
        </Combobox.Dropdown>
      </Combobox>
    </div>
  );
});
