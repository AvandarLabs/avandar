import { Trans } from "@lingui/react/macro";
import { VisuallyHidden } from "@mantine/core";
import classes from "@/components/RichText/MentionMenu/MentionMenuList/MentionMenuList.module.css";
import type { ReactNode } from "react";

type Props = {
  isSearching: boolean;
  searchFailed: boolean;

  /** Gadget rows from an earlier search are still on screen. */
  hasGadgetGroups: boolean;
};

/**
 * The gadget search's status in `MentionMenuList`, a live region kept
 * outside the listbox. It shows a row while the first results load or after
 * a failure, and only announces a refresh while earlier results stay shown.
 */
export function MentionMenuSearchStatus({
  isSearching,
  searchFailed,
  hasGadgetGroups,
}: Props): ReactNode {
  if (searchFailed) {
    return (
      <div className={classes.status} role="status">
        <Trans>Couldn't search. Keep typing to retry.</Trans>
      </div>
    );
  }
  if (isSearching && !hasGadgetGroups) {
    return (
      <div className={classes.status} role="status">
        <Trans>Searching…</Trans>
      </div>
    );
  }
  return (
    <div role="status">
      {isSearching ? (
        <VisuallyHidden>
          <Trans>Updating results</Trans>
        </VisuallyHidden>
      ) : null}
    </div>
  );
}
