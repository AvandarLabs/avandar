import { toSnakeCase } from "@utils/strings/toSnakeCase/toSnakeCase.ts";
import { describe, expect, expectTypeOf, it } from "vitest";

describe("toSnakeCase", () => {
  it("converts camelCase to snake_case", () => {
    expect(toSnakeCase("myKey")).toBe("my_key");
    expect(toSnakeCase("anotherKey")).toBe("another_key");
  });

  it("preserves already snake_case keys", () => {
    expect(toSnakeCase("already_snake")).toBe("already_snake");
  });

  it("handles dashed and spaced phrases", () => {
    expect(toSnakeCase("hello-world")).toBe("hello_world");
    expect(toSnakeCase("hello world")).toBe("hello_world");
  });

  it("returns empty string for empty input", () => {
    expect(toSnakeCase("")).toBe("");
  });

  describe("type narrowing", () => {
    it("infers a snake_case literal for camelCase input", () => {
      const result = toSnakeCase("myKey");
      expectTypeOf(result).toEqualTypeOf<"my_key">();
    });

    it("widens to string when input is string", () => {
      const input: string = "myKey";
      const result = toSnakeCase(input);
      expectTypeOf(result).toEqualTypeOf<string>();
    });
  });
});
