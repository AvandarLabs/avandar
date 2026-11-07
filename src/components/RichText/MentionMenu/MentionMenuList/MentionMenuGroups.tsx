import { Trans } from "@lingui/react/macro";
import { Combobox } from "@mantine/core";
import classes from "@/components/RichText/MentionMenu/MentionMenuList/MentionMenuList.module.css";
import { MentionMenuGroupTitle } from "@/components/RichText/MentionMenu/MentionMenuList/MentionMenuGroupTitle";
import { MentionMenuOption } from "@/components/RichText/MentionMenu/MentionMenuList/MentionMenuOption";
import type { MentionMenuGroup } from "@/components/RichText/MentionMenu/buildMentionMenuGroups/buildMentionMenuGroups";
import type { ReactNode } from "react";

type Props = {
  listboxId: string;

  /** The groups to show, already without gadgets when the search failed. */
  groups: readonly MentionMenuGroup[];

  /** A gadget search is in flight, so the listbox is busy. */
  isSearching: boolean;

  /** Some search status shows, so an empty list does not mean no matches. */
  hasSearchStatus: boolean;
  highlightedItemId: string | undefined;

  /** Builds a row's DOM id, which the editing area points at. */
  buildOptionId: (itemId: string) => string;
};

/**
 * The listbox of `MentionMenuList`: each titled group of rows, or a note
 * when nothing matches at all. While a gadget search is in flight the
 * listbox is busy and a small spinner sits beside the first gadget title.
 */
export function MentionMenuGroups({
  listboxId,
  groups,
  isSearching,
  hasSearchStatus,
  highlightedItemId,
  buildOptionId,
}: Props): ReactNode {
  const refreshingGroupKey =
    isSearching && groups[0]?.key !== "people" ? groups[0]?.key : undefined;
  return (
    <Combobox.Options
      id={listboxId}
      className={classes.groups}
      aria-busy={isSearching}
    >
      {groups.length === 0 && !hasSearchStatus ? (
        <Combobox.Empty>
          <Trans>No matches</Trans>
        </Combobox.Empty>
      ) : null}
      {groups.map((group) => {
        return (
          <Combobox.Group
            key={group.key}
            label={
              <MentionMenuGroupTitle
                groupKey={group.key}
                isRefreshing={group.key === refreshingGroupKey}
              />
            }
          >
            {group.items.map((item) => {
              return (
                <MentionMenuOption
                  key={item.id}
                  item={item}
                  optionId={buildOptionId(item.id)}
                  isHighlighted={item.id === highlightedItemId}
                />
              );
            })}
          </Combobox.Group>
        );
      })}
    </Combobox.Options>
  );
}
