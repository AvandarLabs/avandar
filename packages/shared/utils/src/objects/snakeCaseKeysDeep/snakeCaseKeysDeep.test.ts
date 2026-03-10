import { describe, expect, it } from "vitest";
import { snakeCaseKeysDeep } from "./snakeCaseKeysDeep.ts";

describe("snakeCaseKeysDeep", () => {
  it("converts top-level keys to snake_case", () => {
    const input = { myKey: 1, anotherKey: "hi" };

    const result = snakeCaseKeysDeep(input);

    expect(result).toEqual({
      my_key: 1,
      another_key: "hi",
    });
  });

  it("converts nested keys to snake_case", () => {
    const input = {
      outerKey: {
        innerKey: "value",
        deepNested: { finalKey: true },
      },
    };

    const result = snakeCaseKeysDeep(input);

    expect(result).toEqual({
      outer_key: {
        inner_key: "value",
        deep_nested: { final_key: true },
      },
    });
  });

  it("preserves already snake_case keys", () => {
    const input = { already_snake: 1 };

    const result = snakeCaseKeysDeep(input);

    expect(result).toEqual({ already_snake: 1 });
  });

  it("handles an empty object", () => {
    const result = snakeCaseKeysDeep({});

    expect(result).toEqual({});
  });

  it("converts keys in arrays of objects", () => {
    const input = {
      myList: [
        { itemName: "a" },
        { itemName: "b" },
      ],
    };

    const result = snakeCaseKeysDeep(input);

    expect(result).toEqual({
      my_list: [
        { item_name: "a" },
        { item_name: "b" },
      ],
    });
  });

  it("does not mutate the original object", () => {
    const input = { myKey: 1 };
    const copy = { ...input };

    snakeCaseKeysDeep(input);

    expect(input).toEqual(copy);
  });
});
