import { useLingui } from "@lingui/react/macro";
import { ActionIcon, Button, Group, Popover, Tooltip } from "@mantine/core";
import { IconThumbUp } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ActivityEventClient } from "@/clients/activity/ActivityEventClient";
import { CommentReactionClient } from "@/clients/comments/CommentReactionClient";
import { notifyError } from "@/utils/notifications/notify";
import {
  COMMENT_REACTION_DISPLAY,
  COMMENT_REACTION_KINDS,
  getNextReactionKind,
  summarizeReactions,
} from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentReactions/commentReactionKinds";
import classes from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentReactions/CommentReactions.module.css";
import type { Comment } from "$/models/comments/Comment/Comment";
import type { CommentReaction } from "$/models/comments/CommentReaction/CommentReaction";
import type { User } from "$/models/User/User";
import type { ReactNode } from "react";

/** How long the pointer rests on the reaction button to open the picker. */
const PICKER_OPEN_DELAY_MS = 350;

type Props = {
  comment: Comment.T;
  reactions: readonly CommentReaction.T[];
  currentUserId: User.Id | undefined;
  getMemberName: (userId: string) => string | undefined;
};

/** The CSS variable for a `palette.shade` theme color reference. */
function _buildColorVar(color: string): string {
  return `var(--mantine-color-${color.replace(".", "-")})`;
}

/**
 * The reaction summary and the reaction button. A click toggles your
 * current reaction (Like by default); resting the pointer on the button, or
 * pressing the down arrow on it, opens all six.
 */
export function CommentReactions({
  comment,
  reactions,
  currentUserId,
  getMemberName,
}: Props): ReactNode {
  const { t, i18n } = useLingui();
  const queryClient = useQueryClient();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const openTimerRef = useRef<number | undefined>(undefined);
  const myReaction = reactions.find((reaction) => {
    return reaction.userId === currentUserId;
  });
  const summary = summarizeReactions(reactions, getMemberName);
  const buttonKind = myReaction?.kind ?? "like";
  const ButtonIcon = myReaction
    ? COMMENT_REACTION_DISPLAY[buttonKind].Icon
    : IconThumbUp;

  useEffect(() => {
    return () => {
      window.clearTimeout(openTimerRef.current);
    };
  }, []);

  const pickReaction = async (pickedKind: CommentReaction.Kind) => {
    setIsPickerOpen(false);
    if (!currentUserId || isSaving) {
      return;
    }
    const nextKind = getNextReactionKind(myReaction?.kind, pickedKind);
    setIsSaving(true);
    try {
      if (nextKind === undefined && myReaction) {
        await CommentReactionClient.delete({ id: myReaction.id });
      } else if (nextKind !== undefined) {
        await CommentReactionClient.insert({
          data: {
            commentId: comment.id,
            kind: nextKind,
            userId: currentUserId,
            workspaceId: comment.workspaceId,
          },
          upsert: true,
          onConflict: {
            columnNames: ["comment_id", "user_id"],
            ignoreDuplicates: false,
          },
        });
      }
      await queryClient.invalidateQueries({
        queryKey: [ActivityEventClient.getClientName()],
      });
    } catch {
      notifyError(t`Your reaction could not be saved. Try again.`);
    } finally {
      setIsSaving(false);
    }
  };

  const tooltipLabel = summary.kinds.map((kind) => {
    const names = (summary.namesByKind[kind] ?? []).filter(Boolean).join(", ");
    return (
      <div key={kind}>
        <b>{i18n._(COMMENT_REACTION_DISPLAY[kind].label)}</b> {names}
      </div>
    );
  });

  return (
    <div className={classes.row}>
      {summary.total > 0 ? (
        <Tooltip label={tooltipLabel} multiline>
          <Group gap={4} wrap="nowrap" fz="xs" fw={600}>
            <span className={classes.stack} aria-hidden>
              {summary.kinds.map((kind) => {
                const { Icon, color } = COMMENT_REACTION_DISPLAY[kind];
                return (
                  <span key={kind} className={classes.dot}>
                    <Icon size={11} color={_buildColorVar(color)} />
                  </span>
                );
              })}
            </span>
            {summary.total}
          </Group>
        </Tooltip>
      ) : null}
      <Popover
        opened={isPickerOpen}
        onChange={setIsPickerOpen}
        position="top-start"
        shadow="md"
      >
        <Popover.Target>
          <Button
            variant={myReaction ? "light" : "subtle"}
            color={myReaction ? "primary" : "neutral"}
            size="compact-xs"
            aria-pressed={myReaction !== undefined}
            leftSection={<ButtonIcon size={13} />}
            onClick={() => {
              window.clearTimeout(openTimerRef.current);
              void pickReaction(buttonKind);
            }}
            onMouseEnter={() => {
              openTimerRef.current = window.setTimeout(() => {
                setIsPickerOpen(true);
              }, PICKER_OPEN_DELAY_MS);
            }}
            onMouseLeave={() => {
              window.clearTimeout(openTimerRef.current);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setIsPickerOpen(true);
              }
            }}
          >
            {i18n._(COMMENT_REACTION_DISPLAY[buttonKind].label)}
          </Button>
        </Popover.Target>
        <Popover.Dropdown
          p={4}
          onMouseLeave={() => {
            setIsPickerOpen(false);
          }}
        >
          <div className={classes.picker} role="menu" aria-label={t`Reactions`}>
            {COMMENT_REACTION_KINDS.map((kind) => {
              const { Icon, color, label } = COMMENT_REACTION_DISPLAY[kind];
              return (
                <Tooltip key={kind} label={i18n._(label)}>
                  <ActionIcon
                    variant="subtle"
                    color="neutral"
                    size="lg"
                    role="menuitemradio"
                    aria-checked={myReaction?.kind === kind}
                    aria-label={i18n._(label)}
                    onClick={() => {
                      void pickReaction(kind);
                    }}
                  >
                    <Icon size={22} color={_buildColorVar(color)} />
                  </ActionIcon>
                </Tooltip>
              );
            })}
          </div>
        </Popover.Dropdown>
      </Popover>
    </div>
  );
}
