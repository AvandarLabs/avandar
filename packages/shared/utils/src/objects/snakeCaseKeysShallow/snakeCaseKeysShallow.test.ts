import { describe, expect, it } from "vitest";
import { snakeCaseKeysShallow } from "./snakeCaseKeysShallow.ts";

describe("snakeCaseKeysShallow", () => {
  it("converts top-level keys to snake_case", () => {
    const input = { myKey: 1, anotherKey: "hi" };

    const result = snakeCaseKeysShallow(input);

    expect(result).toEqual({
      my_key: 1,
      another_key: "hi",
    });
  });

  it("does not convert nested keys", () => {
    const input = {
      outerKey: { innerKey: "value" },
    };

    const result = snakeCaseKeysShallow(input);

    expect(result).toEqual({
      outer_key: { innerKey: "value" },
    });
  });

  it("preserves already snake_case keys", () => {
    const input = { already_snake: 1 };

    const result = snakeCaseKeysShallow(input);

    expect(result).toEqual({ already_snake: 1 });
  });

  it("handles an empty object", () => {
    const result = snakeCaseKeysShallow({});

    expect(result).toEqual({});
  });

  it("does not mutate the original object", () => {
    const input = { myKey: 1 };
    const copy = { ...input };

    snakeCaseKeysShallow(input);

    expect(input).toEqual(copy);
  });
});
