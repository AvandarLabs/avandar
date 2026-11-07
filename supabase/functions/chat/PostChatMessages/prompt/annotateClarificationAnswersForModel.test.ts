import { annotateClarificationAnswersForModel } from "@sbfn/chat/PostChatMessages/prompt/annotateClarificationAnswersForModel.ts";
import { describe, expect, it } from "vitest";

describe("annotateClarificationAnswersForModel", () => {
  it("marks a picked answer as the exact values to use, so the model does not look them up again", () => {
    const [annotated] = annotateClarificationAnswersForModel([
      { role: "user", content: "[Clarification answer: Brazil, India, Mexico]" },
    ]);
    expect(annotated?.content).toMatch(
      /^\[Clarification answer: Brazil, India, Mexico\]\n\(.*picked this from the options you offered.*do not look them up again/s,
    );
  });

  it("leaves custom answers, none-of-the-above, and other messages unchanged", () => {
    const messages = [
      { role: "user", content: "[Clarification answer: (custom answer: Wales)]" },
      { role: "user", content: "[Clarification answer: (none of the listed options)]" },
      { role: "user", content: "Show deaths in Brazil" },
      { role: "assistant", content: "[Clarification answer: Brazil]" },
    ];
    expect(annotateClarificationAnswersForModel(messages)).toEqual(messages);
  });
});
