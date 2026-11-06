import { useLingui } from "@lingui/react/macro";
import clsx from "clsx";
import { useRichTextMembers } from "@/components/RichText/RichTextMembersContext";
import classes from "@/components/RichText/UserMention/UserMentionChip.module.css";
import type { ReactNode } from "react";

/**
 * How a mention reads in the editor and the feed: `@` and the member's
 * current name.
 */
export function UserMentionChip({ userId }: { userId: string }): ReactNode {
  const { t } = useLingui();
  const { getMemberName } = useRichTextMembers();
  const memberName = getMemberName(userId);
  return (
    <span
      className={clsx(classes.chip, memberName === undefined && classes.former)}
      data-type="userMention"
      data-id={userId}
    >
      @{memberName ?? t`Former member`}
    </span>
  );
}
