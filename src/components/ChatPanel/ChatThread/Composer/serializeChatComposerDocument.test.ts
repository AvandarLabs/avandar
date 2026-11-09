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
