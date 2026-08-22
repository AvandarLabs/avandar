/** View-change lines must not go through user-message bias/consent. */
import { describe, expect, it } from "vitest";

import { ChatViewEvent } from "@/components/ChatPanel/ChatViewEvent/ChatViewEvent";

import { shouldSkipUserMessageConsent } from "./shouldSkipUserMessageConsent";

describe("shouldSkipUserMessageConsent", () => {
  it("skips view-change and clarification-answer lines", () => {
    expect(
      shouldSkipUserMessageConsent(
        ChatViewEvent.format({
          app: "data-explorer",
          route: "/acme/data-explorer",
        }),
      ),
    ).toBe(true);
    expect(
      shouldSkipUserMessageConsent("[Clarification answer: California]"),
    ).toBe(true);
    expect(shouldSkipUserMessageConsent("[Begin case type design]")).toBe(true);
    expect(shouldSkipUserMessageConsent("count rows")).toBe(false);
  });
});
