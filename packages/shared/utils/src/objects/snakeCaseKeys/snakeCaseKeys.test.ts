import { snakeCaseKeys } from "@utils/objects/snakeCaseKeys/snakeCaseKeys.ts";
import { describe, expect, expectTypeOf, it } from "vitest";

describe("snakeCaseKeys", () => {
  it("maps top-level keys to snake_case shallowly by default", () => {
    const input = { fooBar: 1, snakeCase: 2 };

    const result = snakeCaseKeys(input);

    expect(result).toEqual({ foo_bar: 1, snake_case: 2 });
  });

  it("defaults deep to false when options are omitted", () => {
    const input = { xKey: { nestedKey: true } };

    const result = snakeCaseKeys(input);

    expect(result).toEqual({ x_key: { nestedKey: true } });
  });

  it("respects explicit deep: false like the default", () => {
    const input = { fooBar: 1 };

    const result = snakeCaseKeys(input, { deep: false });

    expect(result).toEqual({ foo_bar: 1 });
  });

  it("does not enumerate symbol keys on the input object", () => {
    const sym = Symbol("s");
    const input: Record<PropertyKey, number> = { aKey: 1 };
    input[sym] = 99;

    const result = snakeCaseKeys(input as { aKey: number });

    expect(result).toEqual({ a_key: 1 });
    expect(Object.getOwnPropertySymbols(result).length).toBe(0);
  });

  it("returns a new object instance", () => {
    const input = { fooBar: 1 };

    const result = snakeCaseKeys(input);

    expect(result).not.toBe(input);
  });

  it("does not mutate the input object", () => {
    const input = { fooBar: 1, snakeCase: 2 };

    snakeCaseKeys(input);

    expect(input).toEqual({ fooBar: 1, snakeCase: 2 });
  });

  it("does not include inherited enumerable properties", () => {
    const proto = { inherited: 123 };
    const input = Object.create(proto) as { ownKey: number } & {
      inherited: number;
    };
    input.ownKey = 5;

    const result = snakeCaseKeys(input);

    expect(result).toEqual({ own_key: 5 });
    expect(Object.prototype.hasOwnProperty.call(result, "inherited")).toBe(
      false,
    );
  });

  it("skips non-enumerable own properties", () => {
    const input: Record<string, number> = { visibleKey: 1 };
    Object.defineProperty(input, "hidden", {
      value: 2,
      enumerable: false,
    });

    const result = snakeCaseKeys(input);

    expect(result).toEqual({ visible_key: 1 });
    expect(Object.prototype.hasOwnProperty.call(result, "hidden")).toBe(false);
  });

  it("returns an empty object when given an empty object", () => {
    const input = {};

    const result = snakeCaseKeys(input);

    expect(result).toEqual({});
  });

  it("preserves values of every runtime type at the snake_case keys", () => {
    const nested = { innerKey: true };
    const input = {
      aVal: null,
      bVal: undefined,
      cNested: nested,
      dStr: "hello",
      eNum: 10,
      fArr: [1, 2],
      gDate: new Date("2020-01-01"),
    };

    const result = snakeCaseKeys(input);

    expect(result).toEqual({
      a_val: null,
      b_val: undefined,
      c_nested: nested,
      d_str: "hello",
      e_num: 10,
      f_arr: [1, 2],
      g_date: input.gDate,
    });
    expect((result as unknown as { c_nested: typeof nested }).c_nested).toBe(
      nested,
    );
  });

  it("does not traverse into Map or Set values when deep is false", () => {
    const map = new Map([["inner", 1]]);
    const set = new Set([2]);
    const input = { mKey: map, sKey: set };

    const result = snakeCaseKeys(input);

    expect(result).toEqual({ m_key: map, s_key: set });
    const remapped = result as unknown as {
      m_key: typeof map;
      s_key: typeof set;
    };
    expect(remapped.m_key).toBe(map);
    expect(remapped.s_key).toBe(set);
  });

  it("uses the last value when two keys collide after snake_case", () => {
    const input = { helloWorld: 1, hello_world: 2 };

    const result = snakeCaseKeys(input);

    expect(result).toEqual({ hello_world: 2 });
  });

  it("supports null-prototype dictionary objects", () => {
    const input = Object.create(null) as Record<string, number>;
    input.myKey = 1;

    const result = snakeCaseKeys(input);

    expect(result).toEqual({ my_key: 1 });
  });

  it("stringifies numeric keys like Object.keys does", () => {
    const input = { 10: "ten", 2: "two" };

    const result = snakeCaseKeys(input);

    expect(result).toEqual({ 10: "ten", 2: "two" });
  });

  it("leaves arrays unchanged when deep is false", () => {
    const input = [{ aB: 1 }, 2, { aB: 3 }];

    const result = snakeCaseKeys(input);

    expect(result).toEqual([{ aB: 1 }, 2, { aB: 3 }]);
  });

  describe("deep: true (deep key mapping)", () => {
    it("maps keys inside nested plain objects", () => {
      const input = { outerKey: { innerKey: 1 } };

      const result = snakeCaseKeys(input, { deep: true });

      expect(result).toEqual({ outer_key: { inner_key: 1 } });
    });

    it("maps keys inside objects nested within arrays", () => {
      const input = {
        itemsKey: [{ colA: 1 }, { colB: 2 }],
      };

      const result = snakeCaseKeys(input, { deep: true });

      expect(result).toEqual({
        items_key: [{ col_a: 1 }, { col_b: 2 }],
      });
    });

    it("does not treat arrays themselves as plain objects to remap", () => {
      const input = { arrKey: [1, 2, 3] };

      const result = snakeCaseKeys(input, { deep: true });

      expect(result).toEqual({ arr_key: [1, 2, 3] });
    });

    it("leaves primitive leaf values unchanged across depth", () => {
      const input = { levelKey: { leafKey: "x" } };

      const result = snakeCaseKeys(input, { deep: true });

      expect(result).toEqual({ level_key: { leaf_key: "x" } });
    });

    it("does not recurse into class instances used as property values", () => {
      class Box {
        public readonly value = 1;
      }
      const box = new Box();
      const input = { boxedBox: box };

      const result = snakeCaseKeys(input, { deep: true });

      expect(result).toEqual({ boxed_box: box });
    });

    it("maps keys inside an empty nested plain object", () => {
      const input = { outerKey: {} };

      const result = snakeCaseKeys(input, { deep: true });

      expect(result).toEqual({ outer_key: {} });
    });

    it("maps top-level keys when nested value is an empty object", () => {
      const input = { outerKey: {} };

      const result = snakeCaseKeys(input, { deep: true });

      expect(result).toEqual({ outer_key: {} });
    });

    it("converts nested keys like prior snakeCaseKeysDeep behavior", () => {
      const input = {
        outerKey: {
          innerKey: "value",
          deepNested: { finalKey: true },
        },
      };

      const result = snakeCaseKeys(input, { deep: true });

      expect(result).toEqual({
        outer_key: {
          inner_key: "value",
          deep_nested: { final_key: true },
        },
      });
    });

    it("preserves already snake_case keys", () => {
      const input = { already_snake: 1 };

      const result = snakeCaseKeys(input, { deep: true });

      expect(result).toEqual({ already_snake: 1 });
    });

    it("converts keys in arrays of objects", () => {
      const input = {
        myList: [{ itemName: "a" }, { itemName: "b" }],
      };

      const result = snakeCaseKeys(input, { deep: true });

      expect(result).toEqual({
        my_list: [{ item_name: "a" }, { item_name: "b" }],
      });
    });
  });
});

// ============================================================================
// Type tests
// ============================================================================

describe("snakeCaseKeys type tests", () => {
  it("preserves readonly input shape when keys are already snake_case", () => {
    const shallowIdentityInput = { a: 1, b: "x" } as const;
    const shallowIdentity = snakeCaseKeys(shallowIdentityInput);
    expectTypeOf(shallowIdentity).toEqualTypeOf<{
      readonly a: 1;
      readonly b: "x";
    }>();
  });

  it("infers snake_case keys in the shallow result type", () => {
    const shallowRenamed = snakeCaseKeys({
      fooBar: 1,
      snakeCase: "x",
    } as const);
    expectTypeOf(shallowRenamed).toEqualTypeOf({
      foo_bar: 1,
      snake_case: "x",
    } as const);
  });

  it("infers snake_case keys deeply in nested structures", () => {
    const deepRenamed = snakeCaseKeys(
      {
        rootKey: {
          leafKey: true,
          nestedArray: [{ colA: 1 }],
        },
      },
      { deep: true },
    );
    expectTypeOf(deepRenamed).toEqualTypeOf({
      root_key: {
        leaf_key: true,
        nested_array: [{ col_a: 1 }],
      },
    });
  });

  it("infers snake_case keys from a const object with camelCase keys", () => {
    const narrowKeys = { alphaKey: 1, betaKey: 2 } as const;
    const narrowRemapped = snakeCaseKeys(narrowKeys);
    expectTypeOf(narrowRemapped).toEqualTypeOf({
      alpha_key: 1,
      beta_key: 2,
    } as const);
  });
});
