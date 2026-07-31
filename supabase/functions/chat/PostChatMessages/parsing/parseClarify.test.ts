import { parseClarify } from "@sbfn/chat/PostChatMessages/parsing/parseClarify.ts";
import { describe, expect, it } from "vitest";

describe("parseClarify", () => {
  it("returns a bounded clarification request for fixed options", () => {
    expect(
      parseClarify(
        JSON.stringify({
          question: "Which region should I compare?",
          rationale: "The dataset contains multiple regions.",
          responseShape: {
            kind: "fixed_options",
            options: ["North", "South"],
            multi: false,
          },
        }),
        0,
      ),
    ).toEqual({
      question: "Which region should I compare?",
      rationale: "The dataset contains multiple regions.",
      responseShape: {
        kind: "fixed_options",
        options: ["North", "South"],
        multi: false,
      },
      turnNumber: 1,
    });
  });
});
