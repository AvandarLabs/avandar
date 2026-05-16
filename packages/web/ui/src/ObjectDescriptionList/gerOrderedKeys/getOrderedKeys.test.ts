import { describe, expect, it } from "vitest";
import { getOrderedKeys } from "./getOrderedKeys";

const ALL_KEYS = ["id", "name", "email", "created_at", "updated_at"] as const;
const REST_KEY = "..." as const;

describe("getOrderedKeys", () => {
  it("returns all keys in order if includeKeys is not specified", () => {
    expect(getOrderedKeys({ allKeys: ALL_KEYS })).toEqual([...ALL_KEYS]);
  });

  it("returns only the includeKeys in specified order if no REST_KEY", () => {
    expect(
      getOrderedKeys({
        allKeys: ALL_KEYS,
        includeKeys: ["email", "id"],
      }),
    ).toEqual(["email", "id"]);
  });

  it("inserts the rest of the keys at REST_KEY middle position", () => {
    const result = getOrderedKeys({
      allKeys: ALL_KEYS,
      includeKeys: ["id", REST_KEY, "updated_at"],
    });
    const head = result[0];
    const last = result[result.length - 1];
    const middle = result.slice(1, -1);
    expect(head).toEqual("id");
    expect(last).toEqual("updated_at");
    expect(middle).toHaveSameMembers(["name", "email", "created_at"]);
  });

  it("preserves the specified order for head keys with REST_KEY", () => {
    const result = getOrderedKeys({
      allKeys: ALL_KEYS,
      includeKeys: ["name", "created_at", REST_KEY, "id"],
    });
    const head = result.slice(0, 2);
    const tail = result[result.length - 1];
    const middle = result.slice(2, -1);
    expect(head).toEqual(["name", "created_at"]);
    expect(tail).toEqual("id");
    expect(middle).toHaveSameMembers(["email", "updated_at"]);
  });

  it("preserves the specified order for tail keys with REST_KEY", () => {
    const result = getOrderedKeys({
      allKeys: ALL_KEYS,
      includeKeys: ["name", REST_KEY, "updated_at", "id"],
    });
    const head = result[0];
    const tail = result.slice(3);
    const middle = result.slice(1, 3);
    expect(head).toEqual("name");
    expect(tail).toEqual(["updated_at", "id"]);
    expect(middle).toHaveSameMembers(["created_at", "email"]);
  });

  it("excludes keys specified in excludeKeys", () => {
    expect(
      getOrderedKeys({
        allKeys: ALL_KEYS,
        excludeKeys: ["email", "updated_at"],
      }),
    ).toEqual(["id", "name", "created_at"]);
  });

  it("excludes keys matching a string prefix in excludeKeysPattern", () => {
    expect(
      getOrderedKeys({
        allKeys: ALL_KEYS,
        excludeKeysPattern: "created",
      }),
    ).toEqual(["id", "name", "email", "updated_at"]);
  });

  it("excludes keys matching a RegExp in excludeKeysPattern", () => {
    expect(
      getOrderedKeys({
        allKeys: ALL_KEYS,
        excludeKeysPattern: /_at$/,
      }),
    ).toEqual(["id", "name", "email"]);
  });

  it("handles empty allKeys", () => {
    expect(getOrderedKeys({ allKeys: [] as const })).toEqual([]);
  });

  it("handles only REST_KEY in includeKeys", () => {
    expect(
      getOrderedKeys({
        allKeys: ALL_KEYS,
        includeKeys: [REST_KEY],
      }),
    ).toHaveSameMembers(ALL_KEYS);
  });

  it("handles REST_KEY at the start of includeKeys", () => {
    const result = getOrderedKeys({
      allKeys: ALL_KEYS,
      includeKeys: [REST_KEY, "email", "id"],
    });
    const head = result.slice(0, 3);
    const tail = result.slice(3);
    expect(head).toHaveSameMembers(["created_at", "updated_at", "name"]);
    expect(tail).toEqual(["email", "id"]);
  });

  it("handles REST_KEY at the end of includeKeys", () => {
    const result = getOrderedKeys({
      allKeys: ALL_KEYS,
      includeKeys: ["email", "id", REST_KEY],
    });
    const head = result.slice(0, 2);
    const tail = result.slice(2);
    expect(head).toEqual(["email", "id"]);
    expect(tail).toHaveSameMembers(["name", "created_at", "updated_at"]);
  });

  it("does not duplicate keys if includeKeys contains keys not in allKeys", () => {
    const result = getOrderedKeys({
      allKeys: ["id", "key2"],
      includeKeys: ["id", "key3", REST_KEY],
    });
    const head = result[0];
    const tail = result.slice(1);
    expect(head).toEqual("id");
    expect(tail).toHaveSameMembers(["key2"]);
  });

  it("returns only present keys in includeKeys even with extras", () => {
    expect(
      getOrderedKeys({
        allKeys: ["id"],
        includeKeys: ["id", "extraKey"],
      }),
    ).toEqual(["id"]);
  });

  it("returns keys without duplicates, even if includeKeys repeats keys", () => {
    const result = getOrderedKeys({
      allKeys: ["id", "key2"],
      includeKeys: ["id", "key2", "key2", "key2"],
    });
    expect(result).toEqual(["id", "key2"]);
  });

  it("returns included keys with excluded keys removed", () => {
    expect(
      getOrderedKeys({
        allKeys: ALL_KEYS,
        includeKeys: ["id", "name", "email"],
        excludeKeys: ["email"],
      }),
    ).toEqual(["id", "name"]);
  });

  it("returns included keys with REST_KEY with excluded keys removed", () => {
    const result = getOrderedKeys({
      allKeys: ALL_KEYS,
      includeKeys: ["id", "email", REST_KEY],
      excludeKeys: ["id", "created_at"],
    });
    const head = result[0];
    const tail = result.slice(1);
    expect(head).toEqual("email");
    expect(tail).toHaveSameMembers(["updated_at", "name"]);
  });

  it("returns included keys but excludes keys by pattern", () => {
    const result = getOrderedKeys({
      allKeys: ALL_KEYS,
      includeKeys: ["id", "created_at", "email"],
      excludeKeysPattern: "created",
    });
    expect(result).toEqual(["id", "email"]);
  });

  it("returns all keys but excludes keys by pattern", () => {
    expect(
      getOrderedKeys({
        allKeys: ALL_KEYS,
        excludeKeysPattern: "created",
      }),
    ).toEqual(["id", "name", "email", "updated_at"]);
  });
});
