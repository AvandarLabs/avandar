import { describe, expect, it } from "vitest";
import { camelCaseKeysDeep } from "./camelCaseKeysDeep.ts";

describe("camelCaseKeysDeep", () => {
  it("converts top-level keys to camelCase", () => {
    const input = { my_key: 1, another_key: "hi" };

    const result = camelCaseKeysDeep(input);

    expect(result).toEqual({ myKey: 1, anotherKey: "hi" });
  });

  it("converts nested keys to camelCase", () => {
    const input = {
      outer_key: {
        inner_key: "value",
        deep_nested: { final_key: true },
      },
    };

    const result = camelCaseKeysDeep(input);

    expect(result).toEqual({
      outerKey: {
        innerKey: "value",
        deepNested: { finalKey: true },
      },
    });
  });

  it("preserves already camelCase keys", () => {
    const input = { alreadyCamel: 1, anotherOne: 2 };

    const result = camelCaseKeysDeep(input);

    expect(result).toEqual({
      alreadyCamel: 1,
      anotherOne: 2,
    });
  });

  it("handles an empty object", () => {
    const result = camelCaseKeysDeep({});

    expect(result).toEqual({});
  });

  it("converts keys in arrays of objects", () => {
    const input = {
      my_list: [{ item_name: "a" }, { item_name: "b" }],
    };

    const result = camelCaseKeysDeep(input);

    expect(result).toEqual({
      myList: [{ itemName: "a" }, { itemName: "b" }],
    });
  });

  it("does not mutate the original object", () => {
    const input = { my_key: 1 };
    const copy = { ...input };

    camelCaseKeysDeep(input);

    expect(input).toEqual(copy);
  });
});
