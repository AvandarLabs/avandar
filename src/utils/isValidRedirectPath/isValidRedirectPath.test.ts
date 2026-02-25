import { describe, expect, it } from "vitest";
import { isValidRedirectPath } from "./isValidRedirectPath";

describe("isValidRedirectPath", () => {
  it("returns true for valid internal paths", () => {
    expect(isValidRedirectPath("/")).toBe(true);
    expect(isValidRedirectPath("/workspace/my-workspace")).toBe(true);
    expect(isValidRedirectPath("/workspace/my-workspace/dashboards")).toBe(
      true,
    );
    expect(isValidRedirectPath("/workspace/xyz?foo=bar")).toBe(true);
  });

  it("returns false for /invalid-workspace", () => {
    expect(isValidRedirectPath("/invalid-workspace")).toBe(false);
  });

  it("returns false for paths that start with /invalid-workspace but have extra segments", () => {
    expect(isValidRedirectPath("/invalid-workspace/something")).toBe(false);
  });

  it("returns false for external URLs", () => {
    expect(isValidRedirectPath("https://example.com/workspace/xyz")).toBe(
      false,
    );
    expect(isValidRedirectPath("http://localhost:3000/workspace")).toBe(false);
  });

  it("returns false for paths not starting with slash", () => {
    expect(isValidRedirectPath("workspace/xyz")).toBe(false);
    expect(isValidRedirectPath("")).toBe(false);
  });

  it("returns false for invalid paths that have params", () => {
    expect(
      isValidRedirectPath(
        "/invalid-workspace?redirectReason=Workspace+not+found+or+access+was+revoked",
      ),
    ).toBe(false);
  });
});
