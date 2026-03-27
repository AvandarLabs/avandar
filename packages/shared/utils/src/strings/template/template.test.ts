import { describe, expect, it } from "vitest";
import { template } from "@utils/strings/template/template.ts";

describe("template", () => {
  it("replaces single token with string value", () => {
    const t = template("Hello $name$!");
    expect(t.parse({ name: "World" })).toBe("Hello World!");
  });

  it("replaces multiple tokens", () => {
    const t = template("SELECT * FROM $table$ WHERE $column$ = '$value$'");
    expect(
      t.parse({
        table: "users",
        column: "name",
        value: "John",
      }),
    ).toBe("SELECT * FROM users WHERE name = 'John'");
  });

  it("replaces same token multiple times", () => {
    const t = template("$x$ and $x$ and $x$");
    expect(t.parse({ x: "foo" })).toBe("foo and foo and foo");
  });

  it("returns template unchanged when no params provided", () => {
    const t = template("Hello $name$!");
    expect(t.parse()).toBe("Hello $name$!");
  });

  it("returns template unchanged when empty params provided", () => {
    const t = template("Hello $name$!");
    expect(t.parse({})).toBe("Hello $name$!");
  });

  it("skips undefined param values", () => {
    const t = template("Hello $name$!");
    expect(t.parse({ name: undefined })).toBe("Hello $name$!");
  });

  it("replaces only provided params, leaves others as tokens", () => {
    const t = template("$a$ and $b$ and $c$");
    expect(t.parse({ a: "one", c: "three" })).toBe("one and $b$ and three");
  });

  it("converts number to string via unknownToString", () => {
    const t = template("Count: $count$");
    expect(t.parse({ count: 42 })).toBe("Count: 42");
  });

  it("converts boolean to string via unknownToString", () => {
    const t = template("Active: $active$");
    expect(t.parse({ active: true })).toBe("Active: true");
    expect(t.parse({ active: false })).toBe("Active: false");
  });

  it("converts null to string via unknownToString", () => {
    const t = template("Value: $val$");
    expect(t.parse({ val: null })).toBe("Value: null");
  });

  it("passes unknownToString options to parse", () => {
    const t = template("Null: $n$ Empty: $e$");
    expect(
      t.parse(
        { n: null, e: "" },
        { nullString: "N/A", emptyString: "(empty)" },
      ),
    ).toBe("Null: N/A Empty: (empty)");
  });

  it("handles template with no tokens", () => {
    const t = template("Hello world, no tokens here");
    expect(t.parse({ foo: "bar" })).toBe("Hello world, no tokens here");
  });

  it("handles extra params not in template", () => {
    const t = template("$a$ only");
    expect(t.parse({ a: "x", b: "y", c: "z" })).toBe("x only");
  });

  it("handles empty string param value", () => {
    const t = template("Value: $val$");
    expect(t.parse({ val: "" })).toBe("Value: ");
  });

  it("handles array param via unknownToString", () => {
    const t = template("Items: $items$");
    expect(t.parse({ items: [1, 2, 3] })).toBe("Items: 1,2,3");
  });

  it("handles object param via unknownToString", () => {
    const t = template("Config: $config$");
    expect(t.parse({ config: { a: 1, b: 2 } })).toBe("Config: a=1|b=2");
  });
});
