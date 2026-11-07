import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Loader } from "@mantine/core";
import classes from "@/components/RichText/MentionMenu/MentionMenuList/MentionMenuList.module.css";
import type { MentionMenuGroupKey } from "@/components/RichText/MentionMenu/buildMentionMenuGroups/buildMentionMenuGroups";
import type { MessageDescriptor } from "@lingui/core";
import type { ReactNode } from "react";

type Props = {
  groupKey: MentionMenuGroupKey;

  /** A newer search is loading while this group shows the last results. */
  isRefreshing: boolean;
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
 * The title over one group of `MentionMenuGroups`, with a small spinner
 * beside it while a newer gadget search loads.
 */
export function MentionMenuGroupTitle({
  groupKey,
  isRefreshing,
}: Props): ReactNode {
  const { i18n } = useLingui();
  return (
    <span className={classes.groupTitle}>
      {i18n._(GROUP_TITLES[groupKey])}
      {isRefreshing ? (
        <Loader size="xs" aria-hidden data-testid="mention-menu-refreshing" />
      ) : null}
    </span>
  );
}
