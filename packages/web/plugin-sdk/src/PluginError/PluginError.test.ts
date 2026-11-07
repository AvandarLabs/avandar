import { PluginError } from "@plugin-sdk/PluginError/PluginError";
import { describe, expect, it } from "vitest";

describe("PluginError", () => {
  it("is an Error that carries its code, name, and message", () => {
    const error = new PluginError("InvalidHandle", "No such query");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("PluginError");
    expect(error.code).toBe("InvalidHandle");
    expect(error.message).toBe("No such query");
  });
});
