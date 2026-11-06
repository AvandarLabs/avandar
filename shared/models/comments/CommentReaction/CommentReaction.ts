/* eslint-disable @typescript-eslint/no-namespace */
import type {
  CommentReactionId,
  CommentReactionKind,
  CommentReactionModel,
} from "$/models/comments/CommentReaction/CommentReaction.types.ts";

export { CommentReactionParsers } from "$/models/comments/CommentReaction/CommentReactionParsers.ts";

/** A member's reaction to a comment. */
export namespace CommentReaction {
  export type T<K extends keyof CommentReactionModel = "Read"> =
    CommentReactionModel[K];
  export type Id = CommentReactionId;
  export type Kind = CommentReactionKind;
}
