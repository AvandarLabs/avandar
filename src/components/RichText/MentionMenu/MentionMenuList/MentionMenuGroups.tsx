import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Combobox } from "@mantine/core";
import classes from "@/components/RichText/MentionMenu/MentionMenuList/MentionMenuList.module.css";
import { MentionMenuOption } from "@/components/RichText/MentionMenu/MentionMenuList/MentionMenuOption";
import type {
  MentionMenuGroup,
  MentionMenuGroupKey,
} from "@/components/RichText/MentionMenu/buildMentionMenuGroups/buildMentionMenuGroups";
import type { MessageDescriptor } from "@lingui/core";
import type { ReactNode } from "react";

type Props = {
  listboxId: string;

  /** The groups to show, already without gadgets while a status shows. */
  groups: readonly MentionMenuGroup[];
  isSearching: boolean;
  searchFailed: boolean;
  highlightedItemId: string | undefined;

  /** Builds a row's DOM id, which the editing area points at. */
  buildOptionId: (itemId: string) => string;
};

const GROUP_TITLES: Readonly<Record<MentionMenuGroupKey, MessageDescriptor>> = {
  dashboards: msg`Dashboards`,
  datasets: msg`Datasets`,
  maps: msg`Maps`,
  caseTypes: msg`Case types`,
  cases: msg`Cases`,
  people: msg`People`,
};

/**
 * The listbox of `MentionMenuList`: one status row in place of the gadget
 * groups while the gadget search is in flight or has failed, then each
 * titled group of rows, or a note when nothing matches at all.
 */
export function MentionMenuGroups({
  listboxId,
  groups,
  isSearching,
  searchFailed,
  highlightedItemId,
  buildOptionId,
}: Props): ReactNode {
  const { i18n } = useLingui();
  const hasSearchStatus = isSearching || searchFailed;
  return (
    <Combobox.Options id={listboxId}>
      {hasSearchStatus ? (
        <div className={classes.status} role="status">
          {isSearching ? (
            <Trans>Searching...</Trans>
          ) : (
            <Trans>Couldn't search. Keep typing to retry.</Trans>
          )}
        </div>
      ) : null}
      {groups.length === 0 && !hasSearchStatus ? (
        <Combobox.Empty>
          <Trans>No matches</Trans>
        </Combobox.Empty>
      ) : null}
      {groups.map((group) => {
        return (
          <Combobox.Group
            key={group.key}
            label={i18n._(GROUP_TITLES[group.key])}
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
