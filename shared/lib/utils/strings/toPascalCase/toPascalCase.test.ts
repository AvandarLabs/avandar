import { describe, expect, it } from "vitest";
import { toPascalCase } from "./toPascalCase";

describe("toPascalCase", () => {
  it("converts simple lowercase words", () => {
    expect(toPascalCase("hello")).toBe("Hello");
    expect(toPascalCase("world")).toBe("World");
  });

  it("converts dashed words", () => {
    expect(toPascalCase("hello-world")).toBe("HelloWorld");
    expect(toPascalCase("foo-bar-baz")).toBe("FooBarBaz");
  });

  it("converts underscored words", () => {
    expect(toPascalCase("hello_world")).toBe("HelloWorld");
    expect(toPascalCase("foo_bar_baz")).toBe("FooBarBaz");
  });

  it("converts words with spaces", () => {
    expect(toPascalCase("hello world")).toBe("HelloWorld");
    expect(toPascalCase("foo bar baz")).toBe("FooBarBaz");
  });

  it("handles combinations of -, _, and space", () => {
    expect(toPascalCase("foo-bar_baz qux")).toBe("FooBarBazQux");
    expect(toPascalCase("foo_bar-baz qux")).toBe("FooBarBazQux");
    expect(toPascalCase("foo bar-baz_qux")).toBe("FooBarBazQux");
  });

  it("does not change already PascalCase words", () => {
    expect(toPascalCase("HelloWorld")).toBe("HelloWorld");
    expect(toPascalCase("FooBarBaz")).toBe("FooBarBaz");
  });

  it("capitalizes only the first letter if no separators", () => {
    expect(toPascalCase("testcase")).toBe("Testcase");
    expect(toPascalCase("another")).toBe("Another");
  });

  it("ignores multiple consecutive separators", () => {
    expect(toPascalCase("foo__bar--baz  qux")).toBe("FooBarBazQux");
    expect(toPascalCase("__foo--bar  baz_")).toBe("FooBarBaz");
  });

  it("handles strings starting with separators", () => {
    expect(toPascalCase("-foo-bar")).toBe("FooBar");
    expect(toPascalCase("_foo_bar")).toBe("FooBar");
    expect(toPascalCase(" foo bar")).toBe("FooBar");
  });

  it("handles empty or whitespace-only string", () => {
    expect(toPascalCase("")).toBe("");
    expect(toPascalCase("    ")).toBe("");
  });

  it("handles strings with numbers", () => {
    expect(toPascalCase("foo1_bar2")).toBe("Foo1Bar2");
    expect(toPascalCase("123test_case")).toBe("123testCase");
    expect(toPascalCase("user_id_42")).toBe("UserId42");
  });

  it("handles strings with symbols and special characters", () => {
    expect(toPascalCase("t@st-value!")).toBe("TStValue");
    expect(toPascalCase("foo#bar$baz%")).toBe("FooBarBaz");
  });

  it("leaves single character strings capitalized", () => {
    expect(toPascalCase("a")).toBe("A");
    expect(toPascalCase("z")).toBe("Z");
  });
});
