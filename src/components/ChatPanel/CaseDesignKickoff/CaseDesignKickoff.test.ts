import { describe, expect, it } from "vitest";

import { isHiddenChatThreadMessage } from "@/components/ChatPanel/ChatThread/isHiddenChatThreadMessage";

import { CaseDesignKickoff } from "./CaseDesignKickoff";

describe("CaseDesignKickoff", () => {
  it("is hidden from the transcript", () => {
    expect(
      isHiddenChatThreadMessage({
        content: CaseDesignKickoff.CONTENT,
        metadata: CaseDesignKickoff.metadata,
      }),
    ).toBe(true);
    expect(
      isHiddenChatThreadMessage({
        content: "I want to define a new case type.",
      }),
    ).toBe(false);
  });
});
