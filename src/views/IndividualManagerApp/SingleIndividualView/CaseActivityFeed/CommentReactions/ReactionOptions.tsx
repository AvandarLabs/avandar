import { useLingui } from "@lingui/react/macro";
import { ActionIcon, Tooltip } from "@mantine/core";
import clsx from "clsx";
import {
  buildReactionColorVar,
  COMMENT_REACTION_DISPLAY,
  COMMENT_REACTION_KINDS,
} from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentReactions/commentReactionKinds";
import classes from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentReactions/CommentReactions.module.css";
import type { CommentReaction } from "$/models/comments/CommentReaction/CommentReaction";
import type { ReactNode } from "react";

type Props = {
  /** Picks are ignored while saving; the options say so but stay focusable. */
  isSaving: boolean;
  currentKind: CommentReaction.Kind | undefined;
  /** The option that takes focus when the picker opens. */
  autoFocusKind: CommentReaction.Kind;
  onPick: (kind: CommentReaction.Kind) => void;
};

/** The six reactions as a row of toggle buttons named by their labels. */
export function ReactionOptions({
  isSaving,
  currentKind,
  autoFocusKind,
  onPick,
}: Props): ReactNode {
  const { t, i18n } = useLingui();
  return (
    <div
      className={clsx(classes.picker, isSaving && classes.saving)}
      role="group"
      aria-label={t`Reactions`}
      aria-busy={isSaving}
    >
      {COMMENT_REACTION_KINDS.map((kind) => {
        const { Icon, color, label } = COMMENT_REACTION_DISPLAY[kind];
        return (
          <Tooltip key={kind} label={i18n._(label)}>
            <ActionIcon
              variant="subtle"
              color="neutral"
              size="lg"
              aria-pressed={currentKind === kind}
              aria-label={i18n._(label)}
              data-autofocus={kind === autoFocusKind || undefined}
              onClick={() => {
                onPick(kind);
              }}
            >
              <Icon size={22} color={buildReactionColorVar(color)} />
            </ActionIcon>
          </Tooltip>
        );
      })}
    </div>
  );
}
