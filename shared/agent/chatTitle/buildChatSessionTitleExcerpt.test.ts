import { describe, expect, it } from "vitest";
import { buildChatSessionTitleExcerpt } from "$/agent/chatTitle/buildChatSessionTitleExcerpt.ts";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken.ts";

const DATASET_ID = "11111111-1111-4111-8111-111111111111";
const OFFLINE_ANSWER = "[An answer from the offline model, not shown]";

describe("buildChatSessionTitleExcerpt", () => {
  it("names a mention by type and masks the user text", () => {
    const token = ChatMentionToken.buildToken({
      gadgetType: "dataset",
      gadgetId: DATASET_ID,
      subId: null,
    });
    const excerpt = buildChatSessionTitleExcerpt({
      messages: [
        { role: "user", content: `Cases for ${token} in Ada` },
        { role: "assistant", content: "42" },
      ],
      mask: (text) => {
        return text.replaceAll("Ada", "Name1");
      },
      offlineAnswerText: OFFLINE_ANSWER,
    });
    expect(excerpt).toContain('@"dataset"');
    expect(excerpt).toContain("Name1");
    expect(excerpt).not.toContain(DATASET_ID);
    expect(excerpt).not.toContain("@{");
    expect(excerpt).not.toContain("Ada");
  });

  it("replaces an offline answer and drops tool-call sql", () => {
    const excerpt = buildChatSessionTitleExcerpt({
      messages: [
        { role: "user", content: "How many cases?" },
        {
          role: "assistant",
          content: [
            { type: "text", text: "The secret row is Ada." },
            {
              type: "tool-call",
              toolName: "run_query",
              args: { sql: "select name from patients" },
            },
          ],
          metadata: { custom: { isOfflineAnswer: true } },
        },
      ],
      mask: (text) => {
        return text;
      },
      offlineAnswerText: OFFLINE_ANSWER,
    });
    expect(excerpt).toContain(OFFLINE_ANSWER);
    expect(excerpt).not.toContain("secret row");
    expect(excerpt).not.toContain("select name");
  });

  it("names an assistant mention by type and drops the gadget id", () => {
    const token = ChatMentionToken.buildToken({
      gadgetType: "dataset",
      gadgetId: DATASET_ID,
      subId: null,
    });
    const excerpt = buildChatSessionTitleExcerpt({
      messages: [
        { role: "user", content: "How many cases?" },
        { role: "assistant", content: `Counted on ${token}` },
      ],
      mask: (text) => {
        return text;
      },
      offlineAnswerText: OFFLINE_ANSWER,
    });
    expect(excerpt).toContain('@"dataset"');
    expect(excerpt).not.toContain("@{");
    expect(excerpt).not.toContain(DATASET_ID);
  });
});
