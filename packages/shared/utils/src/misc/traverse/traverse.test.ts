import { describe, expect, it, vi } from "vitest";
import { traverse } from "./traverse.ts";

function _makeCollector() {
  const nodes: unknown[] = [];
  const callback = vi.fn((node: unknown) => {
    nodes.push(node);
  });

  return { callback, nodes };
}

describe("traverse", () => {
  it("calls callback for primitive values", () => {
    const { callback, nodes } = _makeCollector();

    traverse(123, callback);
    traverse("hello", callback);
    traverse(true, callback);
    traverse(false, callback);
    traverse(null, callback);
    traverse(undefined, callback);

    expect(nodes).toEqual([123, "hello", true, false, null, undefined]);
    expect(callback).toHaveBeenCalledTimes(6);
  });

  it("calls callback for symbols, bigints, and functions", () => {
    const { callback, nodes } = _makeCollector();
    const sym = Symbol("id");
    const fn = () => {
      return "ok";
    };

    traverse(sym, callback);
    traverse(123n, callback);
    traverse(fn, callback);

    expect(nodes).toEqual([sym, 123n, fn]);
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it("recurses into arrays and objects nested inside arrays", () => {
    const { callback, nodes } = _makeCollector();
    const innerObject = { a: 2 };
    const innerArray = [3];
    const input: unknown = [1, innerObject, innerArray];

    traverse(input, callback);

    expect(nodes).toEqual([input, 1, innerObject, 2, innerArray, 3]);
    expect(callback).toHaveBeenCalledTimes(6);
  });

  it("preserves array holes (Array.map does not visit missing items)", () => {
    const { callback, nodes } = _makeCollector();

    const input = new Array<unknown>(3);
    input[0] = 1;
    input[2] = 3;

    traverse(input, callback);

    expect(nodes).toEqual([input, 1, 3]);
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it("traverses objects recursively and recurses into nested arrays", () => {
    const { callback, nodes } = _makeCollector();
    const nestedObject = { b: 2 };
    const nestedArray = [1, nestedObject];
    const inputObject = { a: nestedArray, c: "x" };
    const input: unknown = inputObject;

    traverse(input, callback);

    expect(nodes).toEqual([inputObject, nestedArray, 1, nestedObject, 2, "x"]);
    expect(callback).toHaveBeenCalledTimes(6);
  });

  it("recurses into objects nested inside objects", () => {
    const { callback, nodes } = _makeCollector();
    const innerObject = { c: 2 };
    const inputObject = { a: { b: innerObject } };
    const input: unknown = inputObject;

    traverse(input, callback);

    expect(nodes).toEqual([inputObject, inputObject.a, inputObject.a.b, 2]);
    expect(callback).toHaveBeenCalledTimes(4);
  });

  it("does not recurse into prototypes (only own enumerable props)", () => {
    class ExampleClass {
      public a: number;

      public constructor() {
        this.a = 1;
      }

      public method(): number {
        return 999;
      }
    }

    const { callback, nodes } = _makeCollector();
    const instance = new ExampleClass();

    traverse(instance, callback);

    expect(nodes).toEqual([instance, 1]);
    expect(nodes).not.toContain(ExampleClass.prototype as unknown);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("ignores symbol keys and non-enumerable properties", () => {
    const { callback, nodes } = _makeCollector();

    const symbolKey = Symbol("secret");
    const input: Record<string, unknown> & { [key: symbol]: unknown } = {
      a: 1,
    };

    input[symbolKey] = 2;

    Object.defineProperty(input, "hidden", {
      value: 3,
      enumerable: false,
    });

    traverse(input, callback);

    expect(nodes).toEqual([input, 1]);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("handles objects created with Object.create(null)", () => {
    const { callback, nodes } = _makeCollector();

    const input = Object.create(null) as Record<string, unknown>;
    input.a = 1;
    input.b = { c: 2 };

    traverse(input, callback);

    expect(nodes).toEqual([input, 1, input.b, 2]);
    expect(callback).toHaveBeenCalledTimes(4);
  });

  it("traverses Map and Set contents and visits Date nodes", () => {
    const { callback, nodes } = _makeCollector();
    const date = new Date("2024-01-01T00:00:00Z");
    const mapObjectValue = { c: 2 };
    const map = new Map<unknown, unknown>([
      ["a", 1],
      ["b", mapObjectValue],
    ]);
    const set = new Set<unknown>([3, date]);

    traverse(map, callback);
    traverse(set, callback);

    expect(nodes).toEqual([map, "a", 1, "b", mapObjectValue, 2, set, 3, date]);
    expect(callback).toHaveBeenCalledTimes(9);
  });

  it("treats typed arrays as objects and traverses indices", () => {
    const { callback, nodes } = _makeCollector();

    const input = new Uint8Array([1, 2, 3]);

    traverse(input, callback);

    expect(nodes).toEqual([input, 1, 2, 3]);
    expect(callback).toHaveBeenCalledTimes(4);
  });

  it("handles deeply nested mixed structures (Map in Set in Array in Object)", () => {
    const { callback, nodes } = _makeCollector();

    const innerMapKeyObject = { k: 1 };
    const innerSetValue = new Set<unknown>([2]);
    const innerMap = new Map<unknown, unknown>([
      [innerMapKeyObject, innerSetValue],
    ]);
    const innerSet = new Set<unknown>([innerMap]);
    const rootArray = [innerSet];
    const inputObject = { root: rootArray };
    const input: unknown = inputObject;

    traverse(input, callback);

    expect(nodes).toEqual([
      inputObject,
      rootArray,
      innerSet,
      innerMap,
      innerMapKeyObject,
      1,
      innerSetValue,
      2,
    ]);
    expect(callback).toHaveBeenCalledTimes(8);
  });

  it("does not infinite loop on circular references", () => {
    const { callback, nodes } = _makeCollector();

    const obj: Record<string, unknown> = { a: 1 };
    obj.self = obj;

    traverse(obj, callback);

    const occurrences = nodes.filter((node) => {
      return node === obj;
    }).length;

    expect(occurrences).toBe(1);
    expect(nodes).toContain(1);
    expect(callback).toHaveBeenCalled();
  });

  it("does not mutate arrays or objects", () => {
    const { callback } = _makeCollector();

    const arrayInput = [1, 2, 3] as unknown[];
    const arrayBefore = arrayInput.slice();

    const objectInput = { a: 1, b: { c: 2 } } as const;
    const objectBefore = structuredClone(objectInput);

    traverse(arrayInput, callback);
    traverse(objectInput, callback);

    expect(arrayInput).toEqual(arrayBefore);
    expect(objectInput).toEqual(objectBefore);
  });
});
