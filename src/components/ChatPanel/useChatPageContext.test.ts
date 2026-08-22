import { describe, expect, it } from "vitest";

import { makeChatPageContextFromPathname } from "@/components/ChatPanel/makeChatPageContextFromPathname/makeChatPageContextFromPathname";

describe("makeChatPageContextFromPathname", () => {
  it("classifies data-manager routes as data-sources", () => {
    expect(
      makeChatPageContextFromPathname({
        pathname: "/acme/data-manager",
      }).app,
    ).toBe("data-sources");
    expect(
      makeChatPageContextFromPathname({
        pathname: "/acme/data-manager/data-import",
      }).app,
    ).toBe("data-sources");
  });
});
