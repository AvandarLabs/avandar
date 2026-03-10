import { describe, expect, it } from "vitest";
import { objectValuesMap } from "./objectValuesMap.ts";

describe("objectValuesMap", () => {
  it("maps all own enumerable values shallowly", () => {
    const input = { a: 1, b: 2 };

    const result = objectValuesMap(input, (value) => {
      return value * 10;
    });

    expect(result).toEqual({ a: 10, b: 20 });
  });

  it("passes value and key to the callback", () => {
    const input = { a: 1, b: 2 };
    const calls: Array<{ key: string; value: number }> = [];

    objectValuesMap(input, (value, key) => {
      calls.push({ key: key as string, value: value as number });
      return value;
    });

    expect(calls).toEqual([
      { key: "a", value: 1 },
      { key: "b", value: 2 },
    ]);
  });

  it("returns a new object instance", () => {
    const input = { a: 1 };

    const result = objectValuesMap(input, (value) => {
      return value;
    });

    expect(result).not.toBe(input);
    expect(result).toEqual({ a: 1 });
  });

  it("does not mutate the input object", () => {
    const input = { a: 1, b: 2 };

    objectValuesMap(input, (value) => {
      return value + 1;
    });

    expect(input).toEqual({ a: 1, b: 2 });
  });

  it("does not include inherited properties", () => {
    const proto = { inherited: 123 };
    const input = Object.create(proto) as { own: number } & {
      inherited: number;
    };
    input.own = 5;

    const result = objectValuesMap(input, (value) => {
      return Number(value) + 1;
    });

    expect(result).toEqual({ own: 6 });
    expect(Object.prototype.hasOwnProperty.call(result, "inherited")).toBe(
      false,
    );
  });

  it("skips non-enumerable own properties", () => {
    const input: Record<string, number> = { visible: 1 };
    Object.defineProperty(input, "hidden", {
      value: 2,
      enumerable: false,
    });

    const result = objectValuesMap(input, (value) => {
      return value * 2;
    });

    expect(result).toEqual({ visible: 2 });
    expect(Object.prototype.hasOwnProperty.call(result, "hidden")).toBe(false);
  });

  it("returns an empty object when given an empty object", () => {
    const input = {};

    const result = objectValuesMap(input, () => {
      return "ignored";
    });

    expect(result).toEqual({});
  });

  it("handles values of any type", () => {
    const input = {
      a: null,
      b: undefined,
      c: { nested: true },
      d: "hello",
      e: 10,
    };

    const result = objectValuesMap(input, (value, key) => {
      return `${String(key)}:${typeof value}`;
    });

    expect(result).toEqual({
      a: "a:object",
      b: "b:undefined",
      c: "c:object",
      d: "d:string",
      e: "e:number",
    });
  });

  it("includes keys whose mapped value is undefined by default", () => {
    const input = { a: 1, b: 2 };

    const result = objectValuesMap(input, (value, key) => {
      if (key === "b") {
        return undefined;
      }

      return value * 2;
    });

    expect(result).toEqual({ a: 2, b: undefined });
    expect(Object.prototype.hasOwnProperty.call(result, "b")).toBe(true);
  });

  it("drops keys whose mapped value is undefined when excludeUndefined is true", () => {
    const input = { a: 1, b: 2, c: 3, d: 4, e: 5 };
    const calledKeys: string[] = [];

    const result = objectValuesMap(
      input,
      (_value, key) => {
        calledKeys.push(key);
        if (key === "b") {
          return undefined;
        }

        if (key === "c") {
          return 0;
        }

        if (key === "d") {
          return "";
        }

        if (key === "e") {
          return null;
        }

        return "kept";
      },
      { excludeUndefined: true },
    );

    expect(calledKeys).toEqual(["a", "b", "c", "d", "e"]);

    expect(Object.prototype.hasOwnProperty.call(result, "b")).toBe(false);
    expect(result).toEqual({ a: "kept", c: 0, d: "", e: null });
  });

  it("does not drop keys whose input value is undefined", () => {
    const input = { a: undefined, b: 2 };

    const result = objectValuesMap(
      input,
      (value) => {
        return value === undefined ? "was undefined" : "was defined";
      },
      { excludeUndefined: true },
    );

    expect(result).toEqual({ a: "was undefined", b: "was defined" });
  });
});
