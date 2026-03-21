import { describe, expect, it } from "vitest";
import { append } from "./append.ts";

describe("append", () => {
  it("appends a single element to an array", () => {
    const input: number[] = [1, 2, 3];
    const result = append(5)(input);
    expect(result).toEqual([1, 2, 3, 5]);
  });

  it("appends multiple elements when given an array", () => {
    const appendMany = append([4, 5, 6]);
    const result = appendMany([1, 2, 3]);
    expect(result).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("returns new array and does not mutate input", () => {
    const input = [1, 2, 3];
    const appendFour = append(4);
    const result = appendFour(input);
    expect(result).not.toBe(input);
    expect(input).toEqual([1, 2, 3]);
  });

  it("appends to empty array", () => {
    const appendOne = append(1);
    const empty: number[] = [];
    expect(appendOne(empty)).toEqual([1]);
  });

  it("appending empty array yields unchanged array", () => {
    const appendNone = append([] as number[]);
    const input = [1, 2, 3];
    expect(appendNone(input)).toEqual([1, 2, 3]);
  });

  it("appends single item when given array of one", () => {
    const appendOne = append([99]);
    expect(appendOne([1, 2])).toEqual([1, 2, 99]);
  });

  it("handles objects preserving reference equality for appended items", () => {
    const obj = { id: 1 };
    const appendObj = append(obj);
    const result = appendObj([{ id: 0 }]);
    expect(result).toHaveLength(2);
    expect(result[1]).toBe(obj);
  });
});
