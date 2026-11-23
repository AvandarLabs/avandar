import { describe, expect, it } from "vitest";
import { isAgentAccessDenied } from "@/components/ChatPanel/useAvandarChatRuntime/isAgentAccessDenied";

describe("isAgentAccessDenied", () => {
  it.each([
    "Proxy error: This action requires at least the 'viewer' role on 'data_explorer' in this workspace",
    "Proxy error: 403 Forbidden",
    "Proxy error: Forbidden",
  ])("recognizes the proxy refusing access: %s", (message) => {
    expect(isAgentAccessDenied(new Error(message))).toBe(true);
  });

  it.each([
    "Proxy error: 500 Internal Server Error",
    "Proxy error: This conversation is too long",
    "Failed to fetch",
    "Query failed with 403 rows",
  ])("does not read other failures as refused access: %s", (message) => {
    expect(isAgentAccessDenied(new Error(message))).toBe(false);
  });

  it("is false for something that is not an error", () => {
    expect(isAgentAccessDenied("Proxy error: 403 Forbidden")).toBe(false);
  });
});
