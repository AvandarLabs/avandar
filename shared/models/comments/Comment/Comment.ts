/* eslint-disable @typescript-eslint/no-namespace */
import type {
  CommentId,
  CommentModel,
} from "$/models/comments/Comment/Comment.types.ts";

export { CommentParsers } from "$/models/comments/Comment/CommentParsers.ts";

/** A comment on a case. */
export namespace Comment {
  export type T<K extends keyof CommentModel = "Read"> = CommentModel[K];
  export type Id = CommentId;
}
