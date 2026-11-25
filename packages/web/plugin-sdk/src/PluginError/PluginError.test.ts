import { PluginError } from "@plugin-sdk/PluginError/PluginError";
import { describe, expect, it } from "vitest";

describe("PluginError", () => {
  it("is an instance of Error", () => {
    expect(new PluginError("InvalidHandle", "No such query")).toBeInstanceOf(
      Error,
    );
  });

  it("is named PluginError", () => {
    expect(new PluginError("InvalidHandle", "No such query").name).toBe(
      "PluginError",
    );
  });

  it("carries the code it was created with", () => {
    expect(new PluginError("InvalidHandle", "No such query").code).toBe(
      "InvalidHandle",
    );
  });

  it("carries the message it was created with", () => {
    expect(new PluginError("InvalidHandle", "No such query").message).toBe(
      "No such query",
    );
  });
});
