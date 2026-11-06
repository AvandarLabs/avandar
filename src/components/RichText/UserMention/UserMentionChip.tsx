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
  const { getMemberName, isLoadingMembers } = useRichTextMembers();
  const memberName = getMemberName(userId);
  const isFormerMember = memberName === undefined && !isLoadingMembers;
  return (
    <span
      className={clsx(classes.chip, isFormerMember && classes.former)}
      data-type="userMention"
      data-id={userId}
    >
      @{memberName ?? (isFormerMember ? t`Former member` : t`member`)}
    </span>
  );
}
