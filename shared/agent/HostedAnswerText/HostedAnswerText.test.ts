import { describe, expect, it } from "vitest";
import { HostedAnswerText } from "$/agent/HostedAnswerText/HostedAnswerText.ts";

describe("HostedAnswerText", () => {
  it("gives a hosted model the text the model wrote, not the text shown", () => {
    const metadata = HostedAnswerText.toMetadata("<value 1> has 2 visits.");

    expect(
      HostedAnswerText.getModelText({
        text: "Jane Doe has 2 visits.",
        metadata,
      }),
    ).toBe("<value 1> has 2 visits.");
  });

  it("gives the shown text when no model text was kept", () => {
    expect(
      HostedAnswerText.getModelText({ text: "42", metadata: undefined }),
    ).toBe("42");
    expect(
      HostedAnswerText.getModelText({ text: "42", metadata: { custom: {} } }),
    ).toBe("42");
  });

  it("gives the shown text when the kept model text is not a string", () => {
    expect(
      HostedAnswerText.getModelText({
        text: "42",
        metadata: { custom: { hostedText: 7 } },
      }),
    ).toBe("42");
  });
});
