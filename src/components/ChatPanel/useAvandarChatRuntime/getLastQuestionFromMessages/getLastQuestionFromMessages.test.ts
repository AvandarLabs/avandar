import { describe, expect, it } from "vitest";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import { getLastQuestionFromMessages } from "./getLastQuestionFromMessages";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";

const DATASET_REF: Gadget.Ref = {
  gadgetType: "dataset",
  gadgetId: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
  subId: null,
};
const DATASET_TOKEN = ChatMentionToken.buildToken(DATASET_REF);

describe("getLastQuestionFromMessages", () => {
  it("returns the question a clarification answer belongs to, not the answer marker", () => {
    expect(
      getLastQuestionFromMessages([
        {
          role: "user",
          content:
            "[View changed: app=data-explorer; route=/x; dataset=none; dashboard=none]",
        },
        {
          role: "user",
          content: "Does the US total in the global deaths file match?",
        },
        { role: "assistant", content: "Which of these is the US?" },
        { role: "user", content: "[Clarification answer: US]" },
      ]),
    ).toBe("Does the US total in the global deaths file match?");
  });

  it("returns the latest question when the user asked several", () => {
    expect(
      getLastQuestionFromMessages([
        { role: "user", content: "monthly deaths in California" },
        { role: "assistant", content: "Monthly deaths in California." },
        { role: "user", content: "now do the same for Texas" },
      ]),
    ).toBe("now do the same for Texas");
  });

  it("names each mention when given names", () => {
    expect(
      getLastQuestionFromMessages(
        [{ role: "user", content: `Totals for ${DATASET_TOKEN}?` }],
        () => {
          return "US deaths";
        },
      ),
    ).toBe("Totals for @US deaths?");
  });

  it("keeps the ref tokens without names", () => {
    expect(
      getLastQuestionFromMessages([
        { role: "user", content: `Totals for ${DATASET_TOKEN}?` },
      ]),
    ).toBe(`Totals for ${DATASET_TOKEN}?`);
  });
});
