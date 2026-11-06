import { summarizeReactions } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentReactions/commentReactionKinds";
import classes from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentReactions/CommentReactions.module.css";
import { ReactionPicker } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentReactions/ReactionPicker";
import { ReactionSummaryChip } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentReactions/ReactionSummaryChip";
import { useToggleReaction } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentReactions/useToggleReaction";
import type { Comment } from "$/models/comments/Comment/Comment";
import type { CommentReaction } from "$/models/comments/CommentReaction/CommentReaction";
import type { User } from "$/models/User/User";
import type { ReactNode } from "react";

type Props = {
  comment: Comment.T;
  reactions: readonly CommentReaction.T[];
  currentUserId: User.Id | undefined;
  getMemberName: (userId: string) => string | undefined;
};

/** A comment's reaction summary and the button to react to it. */
export function CommentReactions({
  comment,
  reactions,
  currentUserId,
  getMemberName,
}: Props): ReactNode {
  const myReaction = reactions.find((reaction) => {
    return reaction.userId === currentUserId;
  });
  const summary = summarizeReactions(reactions, getMemberName);
  const { pickReaction, isSaving } = useToggleReaction({
    comment,
    myReaction,
    currentUserId,
  });

  return (
    <div className={classes.row}>
      {summary.total > 0 ? <ReactionSummaryChip summary={summary} /> : null}
      <ReactionPicker
        currentKind={myReaction?.kind}
        isSaving={isSaving}
        onPick={pickReaction}
      />
    </div>
  );
}
