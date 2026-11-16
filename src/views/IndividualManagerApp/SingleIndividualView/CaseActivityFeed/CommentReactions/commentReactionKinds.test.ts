import { describe, expect, it } from "vitest";
import {
  getNextReactionKind,
  summarizeReactions,
} from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentReactions/commentReactionKinds";
import type { CommentReaction } from "$/models/comments/CommentReaction/CommentReaction";

function _reaction(
  userId: string,
  kind: CommentReaction.Kind,
): CommentReaction.T {
  return {
    commentId: "c" as CommentReaction.T["commentId"],
    createdAt: "2026-11-06T10:00:00+00:00",
    id: `r-${userId}` as CommentReaction.Id,
    kind,
    updatedAt: "2026-11-06T10:00:00+00:00",
    userId: userId as CommentReaction.T["userId"],
    workspaceId: "w" as CommentReaction.T["workspaceId"],
  };
}

describe("getNextReactionKind", () => {
  it("sets a reaction when there is none", () => {
    expect(getNextReactionKind(undefined, "like")).toBe("like");
  });

  it("swaps to a different reaction", () => {
    expect(getNextReactionKind("like", "celebrate")).toBe("celebrate");
  });

  it("removes the reaction when the same one is picked again", () => {
    expect(getNextReactionKind("like", "like")).toBeUndefined();
  });
});

describe("summarizeReactions", () => {
  it("counts reactions, orders kinds by count, and groups names", () => {
    const summary = summarizeReactions(
      [
        _reaction("1", "support"),
        _reaction("2", "support"),
        _reaction("3", "like"),
      ],
      (userId) => {
        return { "1": "Dana", "2": "Luis", "3": "Grace" }[userId];
      },
    );
    expect(summary.total).toBe(3);
    expect(summary.kinds).toEqual(["support", "like"]);
    expect(summary.namesByKind.support).toEqual(["Dana", "Luis"]);
  });
});
