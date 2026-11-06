import { Plural, useLingui } from "@lingui/react/macro";
import { Tooltip, VisuallyHidden } from "@mantine/core";
import {
  buildReactionColorVar,
  COMMENT_REACTION_DISPLAY,
} from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentReactions/commentReactionKinds";
import classes from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentReactions/CommentReactions.module.css";
import type { ReactionSummary } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentReactions/commentReactionKinds";
import type { ReactNode } from "react";

type Props = {
  summary: ReactionSummary;
};

/**
 * The stacked reaction icons and the total. Hovering or focusing it lists
 * who reacted, grouped by reaction.
 */
export function ReactionSummaryChip({ summary }: Props): ReactNode {
  const { i18n } = useLingui();
  const whoReacted = summary.kinds.map((kind) => {
    const names = (summary.namesByKind[kind] ?? []).filter(Boolean).join(", ");
    return (
      <div key={kind}>
        <b>{i18n._(COMMENT_REACTION_DISPLAY[kind].label)}</b> {names}
      </div>
    );
  });

  return (
    <Tooltip
      label={whoReacted}
      multiline
      events={{ hover: true, focus: true, touch: false }}
    >
      <span className={classes.summary} tabIndex={0}>
        <span className={classes.stack} aria-hidden>
          {summary.kinds.map((kind) => {
            const { Icon, color } = COMMENT_REACTION_DISPLAY[kind];
            return (
              <span key={kind} className={classes.dot}>
                <Icon size={11} color={buildReactionColorVar(color)} />
              </span>
            );
          })}
        </span>
        <span aria-hidden>{summary.total}</span>
        <VisuallyHidden>
          <Plural value={summary.total} one="# reaction" other="# reactions" />
        </VisuallyHidden>
      </span>
    </Tooltip>
  );
}
