import { enforceChatModelAllowlist } from "@sbfn/chat/PostChatMessages/enforceChatModelAllowlist/enforceChatModelAllowlist.ts";
import { ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOption.ts";
import { describe, expect, it } from "vitest";

describe("enforceChatModelAllowlist", () => {
  it("keeps a model that is in the catalog", () => {
    expect(enforceChatModelAllowlist("z-ai/glm-5.2")).toBe("z-ai/glm-5.2");
  });

  it("falls back to the default when no model is sent", () => {
    expect(enforceChatModelAllowlist(undefined)).toBe(
      ChatModelOption.Catalog.defaultId,
    );
  });

  it("rejects a well-formed model id that is not in the catalog", () => {
    // Shape-only validation used to let this through, which meant a crafted
    // request could bill us for a model the picker never offers.
    expect(enforceChatModelAllowlist("openai/gpt-5.5-pro")).toBe(
      ChatModelOption.Catalog.defaultId,
    );
  });

  it("keeps a non-default catalog model", () => {
    // Guards against a future bug where the function always returns the
    // default and every other test still passes.
    expect(enforceChatModelAllowlist("openai/gpt-5.6-terra")).toBe(
      "openai/gpt-5.6-terra",
    );
  });

  it("rejects a model id that is no longer in the catalog", () => {
    // Still the pre-Task-4 client default, so at this point in the branch this
    // is the mainline path for any user who never touched the picker.
    expect(enforceChatModelAllowlist("openai/gpt-4o-mini")).toBe(
      ChatModelOption.Catalog.defaultId,
    );
  });

  it("rejects malformed input", () => {
    expect(enforceChatModelAllowlist("")).toBe(
      ChatModelOption.Catalog.defaultId,
    );
    expect(enforceChatModelAllowlist("garbage")).toBe(
      ChatModelOption.Catalog.defaultId,
    );
  });

  it("never returns a value outside the catalog", () => {
    // The security contract, stated once. Also the only place the repo
    // records the deliberate verdicts on case, whitespace, and OpenRouter's
    // `:free` / `:batch` variant suffixes: all of them coerce. Accepting
    // `:free` would route to endpoints whose rate limits and data-retention
    // terms we never vetted; accepting `:batch` would change the latency SLA
    // under a synchronous handler. Suffix-stripping would be worse still,
    // silently upgrading a `:free` request to paid billing.
    const adversarialInputs = [
      "",
      " ",
      "garbage",
      "Z-AI/GLM-5.2",
      " z-ai/glm-5.2 ",
      "z-ai/glm-5.2:free",
      "z-ai/glm-5.2:batch",
      "openai/gpt-5.5-pro",
      "../../etc/passwd",
      "z-ai/glm-5.2\n",
    ];
    adversarialInputs.forEach((input) => {
      expect(
        ChatModelOption.Catalog.isValidId(enforceChatModelAllowlist(input)),
      ).toBe(true);
    });
  });
});
