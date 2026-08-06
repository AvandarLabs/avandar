import { makeArrayWithLength } from "@utils/arrays/makeArrayWithLength/makeArrayWithLength.ts";
import { describe, expect, it } from "vitest";

describe("makeArrayWithLength", () => {
  it("returns an array of the given length filled with its indices", () => {
    expect(makeArrayWithLength(3)).toEqual([0, 1, 2]);
  });

  it("returns an empty array for length 0", () => {
    expect(makeArrayWithLength(0)).toEqual([]);
  });

  it("returns a single-element array for length 1", () => {
    expect(makeArrayWithLength(1)).toEqual([0]);
  });

  it("produces an array whose length equals the argument", () => {
    expect(makeArrayWithLength(5)).toHaveLength(5);
  });

  it("returns an empty array for a negative length", () => {
    expect(makeArrayWithLength(-3)).toEqual([]);
  });

  it("floors a non-integer length", () => {
    expect(makeArrayWithLength(2.9)).toEqual([0, 1]);
  });
});
