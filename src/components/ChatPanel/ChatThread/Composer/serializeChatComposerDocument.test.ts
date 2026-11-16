import { describe, expect, it } from "vitest";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import { serializeChatComposerDocument } from "./serializeChatComposerDocument";

const DATASET_REF = {
  gadgetType: "dataset",
  gadgetId: "22222222-2222-4222-8222-222222222222",
  subId: null,
} as const;

const CASE_ID = "55555555-5555-4555-8555-555555555555";

describe("serializeChatComposerDocument", () => {
  it("writes text, line breaks, and chips as tokens", () => {
    const text = serializeChatComposerDocument({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Show " },
            { type: "gadgetLink", attrs: DATASET_REF },
            { type: "hardBreak" },
            { type: "text", text: "by week" },
          ],
        },
        { type: "paragraph", content: [{ type: "text", text: "thanks" }] },
      ],
    });

    expect(text).toBe(
      `Show ${ChatMentionToken.buildToken(DATASET_REF)}\nby week\nthanks`,
    );
  });

  it("drops a chip whose ref is malformed or a case", () => {
    const text = serializeChatComposerDocument({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "gadgetLink",
              attrs: {
                gadgetType: "individual",
                gadgetId: CASE_ID,
                subId: null,
              },
            },
            { type: "gadgetLink", attrs: { gadgetType: "dataset" } },
            { type: "text", text: "hi" },
          ],
        },
      ],
    });

    expect(text).toBe("hi");
  });

  it("keeps an empty paragraph as an empty line", () => {
    const text = serializeChatComposerDocument({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "one" }] },
        { type: "paragraph" },
        { type: "paragraph", content: [{ type: "text", text: "two" }] },
      ],
    });

    expect(text).toBe("one\n\ntwo");
  });
});

/*
 * Written by the 1B adversarial privacy review. A chip the serializer
 * writes as a token that `ChatMentionToken.parse` then rejects stays raw
 * text, so its uuid reaches the model and the stored thread. A pasted
 * chip's `data-sub-id` is any non-empty string.
 */
describe("serializeChatComposerDocument privacy leaks", () => {
  const DASHBOARD_ID = "66666666-6666-4666-8666-666666666666";

  it.each([
    ["a space", "block 1"],
    ["a slash", "block/1"],
    ["a brace", "block}1"],
    ["a next-line character", "block\u00851"],
    ["over 200 characters", "b".repeat(201)],
  ])(
    "never writes a tile chip whose sub id has %s as a raw uuid",
    (_label, subId) => {
      const text = serializeChatComposerDocument({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Show " },
              {
                type: "gadgetLink",
                attrs: {
                  gadgetType: "dashboard_tile",
                  gadgetId: DASHBOARD_ID,
                  subId,
                },
              },
            ],
          },
        ],
      });

      // Either a token the parser reads back, or no chip at all.
      const leftover = ChatMentionToken.parse(text)
        .filter((segment) => {
          return segment.kind === "text";
        })
        .map((segment) => {
          return segment.kind === "text" ? segment.text : "";
        })
        .join("");
      expect(leftover).not.toContain(DASHBOARD_ID);
    },
  );
});
