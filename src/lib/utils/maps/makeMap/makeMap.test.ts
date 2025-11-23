import { describe, expect, it } from "vitest";

import { makeMap } from "./makeMap";

describe("makeMap", () => {
  it("maps using property keys when key/valueKey are provided", () => {
    const data = [
      { id: "1", name: "Alice", role: "admin" },
      { id: "2", name: "Bob", role: "viewer" },
    ] as const;

    const result = makeMap(data, { key: "id", valueKey: "role" });

    expect(Array.from(result.entries())).toEqual([
      ["1", "admin"],
      ["2", "viewer"],
    ]);
  });

  it("falls back to keyFn/valueFn when structural keys are omitted", () => {
    const data = [
      { firstName: "Alice", lastName: "Smith", age: 30 },
      { firstName: "Bob", lastName: "Jones", age: 28 },
    ];

    const result = makeMap(data, {
      keyFn: (item) => {
        return `${item.firstName}:${item.lastName}`;
      },
      valueFn: (item) => {
        return { fullName: `${item.firstName} ${item.lastName}`, age: item.age };
      },
    });

    expect(result.get("Alice:Smith")).toEqual({ fullName: "Alice Smith", age: 30 });
    expect(result.get("Bob:Jones")).toEqual({ fullName: "Bob Jones", age: 28 });
  });

  it("allows valueKey to override valueFn", () => {
    const data = [
      { id: 1, label: "first", fallback: "unused" },
      { id: 2, label: "second", fallback: "ignored" },
    ];

    const result = makeMap(data, {
      key: "id",
      valueKey: "label",
      valueFn: (item) => {
        return item.fallback;
      },
    });

    expect(result.get(1)).toBe("first");
    expect(result.get(2)).toBe("second");
  });

  it("keeps the last value when duplicate keys are encountered", () => {
    const data = [
      { id: "dup", value: 1 },
      { id: "dup", value: 2 },
    ];

    const result = makeMap(data, { key: "id", valueKey: "value" });

    expect(result.get("dup")).toBe(2);
    expect(result.size).toBe(1);
  });
});
