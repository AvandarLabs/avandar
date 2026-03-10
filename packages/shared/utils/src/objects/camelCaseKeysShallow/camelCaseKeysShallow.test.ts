import { describe, expect, it } from "vitest";
import { camelCaseKeysShallow } from "./camelCaseKeysShallow.ts";

describe("camelCaseKeysShallow", () => {
  it("converts top-level keys to camelCase", () => {
    const input = { my_key: 1, another_key: "hi" };

    const result = camelCaseKeysShallow(input);

    expect(result).toEqual({ myKey: 1, anotherKey: "hi" });
  });

  it("does not convert nested keys", () => {
    const input = {
      outer_key: { inner_key: "value" },
    };

    const result = camelCaseKeysShallow(input);

    expect(result).toEqual({
      outerKey: { inner_key: "value" },
    });
  });

  it("preserves already camelCase keys", () => {
    const input = { alreadyCamel: 1 };

    const result = camelCaseKeysShallow(input);

    expect(result).toEqual({ alreadyCamel: 1 });
  });

  it("handles an empty object", () => {
    const result = camelCaseKeysShallow({});

    expect(result).toEqual({});
  });

  it("does not mutate the original object", () => {
    const input = { my_key: 1 };
    const copy = { ...input };

    camelCaseKeysShallow(input);

    expect(input).toEqual(copy);
  });
});
