import { describe, expect, expectTypeOf, it } from "vitest";
import { prefix } from "@utils/strings/prefix/prefix.ts";

describe("prefix", () => {
  it("prefixes a string with the given prefix", () => {
    expect(prefix("pre_", "value")).toBe("pre_value");
  });

  it("returns the prefix when the string is empty", () => {
    expect(prefix("pre_", "")).toBe("pre_");
  });

  it("returns the string when the prefix is empty", () => {
    expect(prefix("", "value")).toBe("value");
  });

  it("returns an empty string when both are empty", () => {
    expect(prefix("", "")).toBe("");
  });

  it("works with special characters in the prefix", () => {
    expect(prefix("@", "user")).toBe("@user");
    expect(prefix("#", "tag")).toBe("#tag");
    expect(prefix("/api/", "users")).toBe("/api/users");
  });

  it("works with multi-word strings", () => {
    expect(prefix("hello ", "world")).toBe("hello world");
  });

  describe("type narrowing", () => {
    it("infers the prefixed literal type", () => {
      const result = prefix("pre_", "value");
      expectTypeOf(result).toEqualTypeOf<"pre_value">();
    });

    it("infers the string when the prefix is empty", () => {
      const result = prefix("", "value");
      expectTypeOf(result).toEqualTypeOf<"value">();
    });

    it("infers the prefix when the string is empty", () => {
      const result = prefix("pre_", "");
      expectTypeOf(result).toEqualTypeOf<"pre_">();
    });
  });
});
