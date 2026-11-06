import { msg } from "@lingui/core/macro";
import {
  IconBulb,
  IconConfetti,
  IconHeartFilled,
  IconHeartHandshake,
  IconMoodHappy,
  IconThumbUpFilled,
} from "@tabler/icons-react";
import type { CommentReaction } from "$/models/comments/CommentReaction/CommentReaction";
import type { MessageDescriptor } from "@lingui/core";
import type { Icon } from "@tabler/icons-react";

/** The six reactions in picker order. Like is the one-click default. */
export const COMMENT_REACTION_KINDS: readonly CommentReaction.Kind[] = [
  "like",
  "celebrate",
  "support",
  "love",
  "insightful",
  "funny",
];

/**
 * Label, icon, and icon color of each reaction. Colors are Mantine theme
 * color references (`palette.shade`).
 */
export const COMMENT_REACTION_DISPLAY: Readonly<
  Record<
    CommentReaction.Kind,
    { label: MessageDescriptor; Icon: Icon; color: string }
  >
> = {
  like: { label: msg`Like`, Icon: IconThumbUpFilled, color: "primary.7" },
  celebrate: {
    label: msg`Celebrate`,
    Icon: IconConfetti,
    color: "success.8",
  },
  support: { label: msg`Support`, Icon: IconHeartHandshake, color: "grape.7" },
  love: { label: msg`Love`, Icon: IconHeartFilled, color: "danger.6" },
  insightful: { label: msg`Insightful`, Icon: IconBulb, color: "warning.8" },
  funny: { label: msg`Funny`, Icon: IconMoodHappy, color: "info.8" },
};

/**
 * The reaction after a member picks `pickedKind`: picking your current
 * reaction removes it, anything else replaces it.
 */
export function getNextReactionKind(
  currentKind: CommentReaction.Kind | undefined,
  pickedKind: CommentReaction.Kind,
): CommentReaction.Kind | undefined {
  return currentKind === pickedKind ? undefined : pickedKind;
}

/** Totals for the reaction summary chip and its tooltip. */
export type ReactionSummary = {
  total: number;
  kinds: CommentReaction.Kind[];
  namesByKind: Partial<Record<CommentReaction.Kind, string[]>>;
};

/** Counts a comment's reactions, most common kind first. */
export function summarizeReactions(
  reactions: readonly CommentReaction.T[],
  getMemberName: (userId: string) => string | undefined,
): ReactionSummary {
  const namesByKind: Partial<Record<CommentReaction.Kind, string[]>> = {};
  reactions.forEach((reaction) => {
    const names = namesByKind[reaction.kind] ?? [];
    names.push(getMemberName(reaction.userId) ?? "");
    namesByKind[reaction.kind] = names;
  });
  const kinds = COMMENT_REACTION_KINDS.filter((kind) => {
    return (namesByKind[kind]?.length ?? 0) > 0;
  }).sort((kindA, kindB) => {
    return (
      (namesByKind[kindB]?.length ?? 0) - (namesByKind[kindA]?.length ?? 0)
    );
  });
  return { total: reactions.length, kinds, namesByKind };
}
