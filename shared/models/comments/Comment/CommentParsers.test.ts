import { describe, expect, it } from "vitest";
import { CommentParsers } from "$/models/comments/Comment/Comment.ts";
import type { Comment } from "$/models/comments/Comment/Comment.ts";

function _dbRow(
  overrides: Partial<Comment.T<"DBRead">> = {},
): Comment.T<"DBRead"> {
  return {
    author_user_id: "11111111-1111-4111-8111-111111111111",
    body: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "userMention",
              attrs: { id: "22222222-2222-4222-8222-222222222222" },
            },
          ],
        },
      ],
    },
    body_schema_version: 1,
    body_text: "@member",
    created_at: "2026-11-06T10:00:00+00:00",
    deleted_at: null,
    edited_at: null,
    id: "33333333-3333-4333-8333-333333333333",
    individual_id: "44444444-4444-4444-8444-444444444444",
    updated_at: "2026-11-06T10:00:00+00:00",
    workspace_id: "55555555-5555-4555-8555-555555555555",
    ...overrides,
  };
}

describe("CommentParsers", () => {
  it("keeps the document's own keys untouched when camel-casing the row", () => {
    const comment = CommentParsers.fromDBReadToModelRead(_dbRow());
    expect(comment.bodyText).toBe("@member");
    expect(comment.body?.content?.[0]?.content?.[0]).toEqual({
      type: "userMention",
      attrs: { id: "22222222-2222-4222-8222-222222222222" },
    });
  });

  it("still reads a comment whose document has a node this build does not know", () => {
    const comment = CommentParsers.fromDBReadToModelRead(
      _dbRow({
        body: {
          type: "doc",
          content: [{ type: "objectEmbed", attrs: { id: "x" } }],
        },
      }),
    );
    expect(comment.body?.content?.[0]?.type).toBe("objectEmbed");
  });

  it("reads a deleted comment, whose body is gone", () => {
    const comment = CommentParsers.fromDBReadToModelRead(
      _dbRow({
        body: null,
        body_text: null,
        deleted_at: "2026-11-06T11:00:00+00:00",
      }),
    );
    expect(comment.body).toBeUndefined();
    expect(comment.deletedAt).toBe("2026-11-06T11:00:00+00:00");
  });
});
