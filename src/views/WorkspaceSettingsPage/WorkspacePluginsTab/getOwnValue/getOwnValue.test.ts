import { describe, expect, it } from "vitest";
import { getOwnValue } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/getOwnValue/getOwnValue";

describe("getOwnValue", () => {
  it("gets the value of an own key", () => {
    expect(getOwnValue({ cases: "a" }, "cases")).toBe("a");
  });

  it("gets undefined for a missing key", () => {
    expect(getOwnValue({ cases: "a" }, "deaths")).toBeUndefined();
  });

  it("gets undefined for a key only the prototype has", () => {
    expect(getOwnValue({ cases: "a" }, "constructor")).toBeUndefined();
    expect(getOwnValue({ cases: "a" }, "toString")).toBeUndefined();
  });

  it("gets the value of an own key named like a prototype member", () => {
    expect(getOwnValue({ constructor: "a" }, "constructor")).toBe("a");
  });
});
