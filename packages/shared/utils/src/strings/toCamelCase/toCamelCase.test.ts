import { describe, expect, expectTypeOf, it } from "vitest";
import { toCamelCase } from "@utils/strings/toCamelCase/toCamelCase.ts";

describe("toCamelCase", () => {
  it("converts simple dashed and underscored phrases with defaults", () => {
    expect(toCamelCase("hello-world")).toBe("helloWorld");
    expect(toCamelCase("hello_world")).toBe("helloWorld");
    expect(toCamelCase("hello world")).toBe("helloWorld");
  });

  it("removes punctuation and symbols", () => {
    expect(toCamelCase("foo@bar#baz!")).toBe("fooBarBaz");
    expect(toCamelCase("t@st-value!")).toBe("tStValue");
  });

  it("keeps rawSQL when preserveConsecutiveUppercase is true (default)", () => {
    expect(toCamelCase("rawSQL")).toBe("rawSQL");
    expect(toCamelCase("rawSQL", { preserveConsecutiveUppercase: true })).toBe(
      "rawSQL",
    );
  });

  it("maps rawSQL to rawSql when preserveConsecutiveUppercase is false", () => {
    expect(toCamelCase("rawSQL", { preserveConsecutiveUppercase: false })).toBe(
      "rawSql",
    );
  });

  it("preserves successive uppercase in later segments when enabled", () => {
    expect(
      toCamelCase("foo-rawSQL", { preserveConsecutiveUppercase: true }),
    ).toBe("fooRawSQL");
  });

  it("handles HTTPServer-style boundaries", () => {
    expect(toCamelCase("HTTP-Server")).toBe("httpServer");
  });

  it("returns empty string for empty or separator-only input", () => {
    expect(toCamelCase("")).toBe("");
    expect(toCamelCase("   ")).toBe("");
    expect(toCamelCase("___---")).toBe("");
  });

  it("ignores repeated separators", () => {
    expect(toCamelCase("foo__bar--baz  qux")).toBe("fooBarBazQux");
  });

  it("handles numbers", () => {
    expect(toCamelCase("user_id_42")).toBe("userId42");
    expect(toCamelCase("foo1-bar2")).toBe("foo1Bar2");
  });

  it("treats single words as the first segment only", () => {
    expect(toCamelCase("hello")).toBe("hello");
    expect(toCamelCase("Hello")).toBe("hello");
  });

  describe("type narrowing", () => {
    it("infers a camelCase literal for kebab-case input", () => {
      const result = toCamelCase("hello-world");
      expectTypeOf(result).toEqualTypeOf<"helloWorld">();
    });

    it("infers a camelCase literal when options are omitted", () => {
      const result = toCamelCase("foo-bar-baz");
      expectTypeOf(result).toEqualTypeOf<"fooBarBaz">();
    });

    it("infers a camelCase literal when options are an empty object", () => {
      const result = toCamelCase("foo-bar-baz", {});
      expectTypeOf(result).toEqualTypeOf<"fooBarBaz">();
    });

    it("preserves rawSQL in the literal type with the default option", () => {
      const result = toCamelCase("rawSQL");
      expectTypeOf(result).toEqualTypeOf<"rawSQL">();
    });

    it("preserves rawSQL when preserveConsecutiveUppercase is true", () => {
      const result = toCamelCase("rawSQL", {
        preserveConsecutiveUppercase: true,
      });
      expectTypeOf(result).toEqualTypeOf<"rawSQL">();
    });

    it("normalizes rawSql in the literal type when preserve is false", () => {
      const result = toCamelCase("rawSQL", {
        preserveConsecutiveUppercase: false,
      });
      expectTypeOf(result).toEqualTypeOf<"rawSql">();
    });

    it("infers fooRawSQL for mixed segments when preserve is true", () => {
      const result = toCamelCase("foo-rawSQL", {
        preserveConsecutiveUppercase: true,
      });
      expectTypeOf(result).toEqualTypeOf<"fooRawSQL">();
    });

    it("widens to string when input is string", () => {
      const input: string = "hello-world";
      const result = toCamelCase(input);
      expectTypeOf(result).toEqualTypeOf<string>();
    });

    it("infers an empty string literal for empty input", () => {
      const result = toCamelCase("");
      expectTypeOf(result).toEqualTypeOf<"">();
    });
  });
});
