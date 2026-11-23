import { NavLinkList } from "@avandar/ui";
import { Trans } from "@lingui/react/macro";
import { Skeleton, Stack, Text } from "@mantine/core";
import { IconInbox } from "@tabler/icons-react";
import css from "@/views/IndividualManagerApp/IndividualNavbar/IndividualNavbar.module.css";
import type { VirtualIndividualLink } from "@/views/IndividualManagerApp/useVirtualIndividualLinks";
import type { ReactNode } from "react";

type Props = {
  isLoading: boolean;
  hasRecords: boolean;
  /** What to say when no record matches. Defaults to "No records yet". */
  emptyMessage?: ReactNode;
  links: readonly VirtualIndividualLink[];
  listHeight: number;
};

/**
 * The body of the records list: a skeleton while the first page loads, an
 * empty state that says whether a filter or the case type is empty, or the
 * virtualized rows.
 */
export function IndividualNavbarRows({
  isLoading,
  hasRecords,
  emptyMessage,
  links,
  listHeight,
}: Readonly<Props>): ReactNode {
  if (isLoading && !hasRecords) {
    return (
      <Stack gap={6} pt="xxs">
        <Skeleton height={28} radius="sm" />
        <Skeleton height={28} radius="sm" width="80%" />
        <Skeleton height={28} radius="sm" width="65%" />
      </Stack>
    );
  }

  if (!hasRecords) {
    return (
      <Stack gap="xs" align="center" py="lg" px="xs" ta="center">
        <IconInbox
          size={22}
          stroke={1.5}
          aria-hidden
          className={css.individualNavbarEmptyIcon}
        />
        <Text size="sm" c="dimmed">
          {emptyMessage ?? <Trans>No records yet</Trans>}
        </Text>
      </Stack>
    );
  }

  return (
    <NavLinkList
      links={links}
      gap="xs"
      inactiveHoverColor="neutral.1"
      className={css.individualNavbarList}
      // The virtualizer measures the list; its height cannot be static.
      style={{ height: listHeight }}
    />
  );
}
