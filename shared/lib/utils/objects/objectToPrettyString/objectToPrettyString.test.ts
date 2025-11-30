import { describe, expect, it } from "vitest";
import { objectToPrettyString } from "./objectToPrettyString.ts";

describe("objectToPrettyString", () => {
  it("handles empty arrays", () => {
    const result = objectToPrettyString([]);
    expect(result).toBe("[]");
  });

  it("handles simple arrays", () => {
    const result = objectToPrettyString([1, 2, 3]);
    expect(result).toBe(
      `[
\t1
\t2
\t3
]`,
    );
  });

  it("handles arrays with mixed types", () => {
    const result = objectToPrettyString(["a", 1, true, null]);
    expect(result).toBe(
      `[
\ta
\t1
\ttrue
\tnull
]`,
    );
  });

  it("handles empty objects", () => {
    const result = objectToPrettyString({});
    expect(result).toBe("{}");
  });

  it("handles simple objects", () => {
    const result = objectToPrettyString({ a: 1, b: 2 });
    expect(result).toBe(
      `{
\ta: 1
\tb: 2
}`,
    );
  });

  it("handles nested objects", () => {
    const result = objectToPrettyString({
      a: 1,
      b: {
        c: 2,
        d: 3,
      },
    });
    expect(result).toBe(
      `{
\ta: 1
\tb: {
\t\tc: 2
\t\td: 3
\t}
}`,
    );
  });

  it("handles arrays of objects", () => {
    const result = objectToPrettyString([{ a: 1 }, { b: 2 }]);
    expect(result).toBe(
      `[
\t{
\t\ta: 1
\t}
\t{
\t\tb: 2
\t}
]`,
    );
  });

  it("handles objects with arrays", () => {
    const result = objectToPrettyString({
      items: [1, 2, 3],
      name: "test",
    });
    expect(result).toBe(
      `{
\titems: [
\t\t1
\t\t2
\t\t3
\t]
\tname: test
}`,
    );
  });

  it("handles deeply nested objects", () => {
    const result = objectToPrettyString({
      level1: {
        level2: {
          level3: "value",
        },
      },
    });
    expect(result).toBe(
      `{
\tlevel1: {
\t\tlevel2: {
\t\t\tlevel3: value
\t\t}
\t}
}`,
    );
  });

  it("handles arrays with nested objects", () => {
    const result = objectToPrettyString([
      {
        id: 1,
        name: "first",
      },
      {},
      "not an object",
      {
        id: 2,
        name: "second",
      },
    ]);
    expect(result).toBe(
      `[
\t{
\t\tid: 1
\t\tname: first
\t}
\t{}
\tnot an object
\t{
\t\tid: 2
\t\tname: second
\t}
]`,
    );
  });

  it("handles complex nested structures", () => {
    const result = objectToPrettyString({
      users: [
        {
          id: 1,
          profile: {
            name: "John",
            age: 30,
          },
        },
        {
          id: 2,
          profile: {
            name: "Jane",
            age: 25,
          },
        },
      ],
      metadata: {
        count: 2,
        tags: ["admin", "user"],
      },
      properties: {},
    });
    expect(result).toBe(
      `{
\tusers: [
\t\t{
\t\t\tid: 1
\t\t\tprofile: {
\t\t\t\tname: John
\t\t\t\tage: 30
\t\t\t}
\t\t}
\t\t{
\t\t\tid: 2
\t\t\tprofile: {
\t\t\t\tname: Jane
\t\t\t\tage: 25
\t\t\t}
\t\t}
\t]
\tmetadata: {
\t\tcount: 2
\t\ttags: [
\t\t\tadmin
\t\t\tuser
\t\t]
\t}
\tproperties: {}
}`,
    );
  });

  it("handles objects with null and undefined values", () => {
    const result = objectToPrettyString({
      a: null,
      b: undefined,
      c: "value",
    });
    expect(result).toBe(`{
\ta: null
\tb: undefined
\tc: value
}`);
  });

  it("handles arrays with nested arrays", () => {
    const result = objectToPrettyString([[1, 2], "not an array", [3, 4], []]);
    expect(result).toBe(`[
\t[
\t\t1
\t\t2
\t]
\tnot an array
\t[
\t\t3
\t\t4
\t]
\t[]
]`);
  });
});
