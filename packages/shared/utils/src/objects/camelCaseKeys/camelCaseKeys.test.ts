import { describe, expect, expectTypeOf, it } from "vitest";
import { camelCaseKeys } from "@utils/objects/camelCaseKeys/camelCaseKeys.ts";

describe("camelCaseKeys", () => {
  it("maps top-level keys to camelCase shallowly by default", () => {
    const input = { foo_bar: 1, snake_case: 2 };

    const result = camelCaseKeys(input);

    expect(result).toEqual({ fooBar: 1, snakeCase: 2 });
  });

  it("defaults deep to false when options are omitted", () => {
    const input = { x_key: { nested_key: true } };

    const result = camelCaseKeys(input);

    expect(result).toEqual({ xKey: { nested_key: true } });
  });

  it("respects explicit deep: false like the default", () => {
    const input = { foo_bar: 1 };

    const result = camelCaseKeys(input, { deep: false });

    expect(result).toEqual({ fooBar: 1 });
  });

  it("does not enumerate symbol keys on the input object", () => {
    const sym = Symbol("s");
    const input: Record<PropertyKey, number> = { a_key: 1 };
    input[sym] = 99;

    const result = camelCaseKeys(input as { a_key: number });

    expect(result).toEqual({ aKey: 1 });
    expect(Object.getOwnPropertySymbols(result).length).toBe(0);
  });

  it("returns a new object instance", () => {
    const input = { foo_bar: 1 };

    const result = camelCaseKeys(input);

    expect(result).not.toBe(input);
  });

  it("does not mutate the input object", () => {
    const input = { foo_bar: 1, snake_case: 2 };

    camelCaseKeys(input);

    expect(input).toEqual({ foo_bar: 1, snake_case: 2 });
  });

  it("does not include inherited enumerable properties", () => {
    const proto = { inherited: 123 };
    const input = Object.create(proto) as { own_key: number } & {
      inherited: number;
    };
    input.own_key = 5;

    const result = camelCaseKeys(input);

    expect(result).toEqual({ ownKey: 5 });
    expect(Object.prototype.hasOwnProperty.call(result, "inherited")).toBe(
      false,
    );
  });

  it("skips non-enumerable own properties", () => {
    const input: Record<string, number> = { visible_key: 1 };
    Object.defineProperty(input, "hidden", {
      value: 2,
      enumerable: false,
    });

    const result = camelCaseKeys(input);

    expect(result).toEqual({ visibleKey: 1 });
    expect(Object.prototype.hasOwnProperty.call(result, "hidden")).toBe(false);
  });

  it("returns an empty object when given an empty object", () => {
    const input = {};

    const result = camelCaseKeys(input);

    expect(result).toEqual({});
  });

  it("preserves values of every runtime type at the camelCase keys", () => {
    const nested = { inner_key: true };
    const input = {
      a_val: null,
      b_val: undefined,
      c_nested: nested,
      d_str: "hello",
      e_num: 10,
      f_arr: [1, 2],
      g_date: new Date("2020-01-01"),
    };

    const result = camelCaseKeys(input);

    expect(result).toEqual({
      aVal: null,
      bVal: undefined,
      cNested: nested,
      dStr: "hello",
      eNum: 10,
      fArr: [1, 2],
      gDate: input.g_date,
    });
    expect((result as unknown as { cNested: typeof nested }).cNested).toBe(
      nested,
    );
  });

  it("does not traverse into Map or Set values when deep is false", () => {
    const map = new Map([["inner", 1]]);
    const set = new Set([2]);
    const input = { m_key: map, s_key: set };

    const result = camelCaseKeys(input);

    expect(result).toEqual({ mKey: map, sKey: set });
    const remapped = result as unknown as {
      mKey: typeof map;
      sKey: typeof set;
    };
    expect(remapped.mKey).toBe(map);
    expect(remapped.sKey).toBe(set);
  });

  it("uses the last value when two keys collide after camelCase", () => {
    const input = { hello_world: 1, "hello-world": 2 };

    const result = camelCaseKeys(input);

    expect(result).toEqual({ helloWorld: 2 });
  });

  it("supports null-prototype dictionary objects", () => {
    const input = Object.create(null) as Record<string, number>;
    input.my_key = 1;

    const result = camelCaseKeys(input);

    expect(result).toEqual({ myKey: 1 });
  });

  it("stringifies numeric keys like Object.keys does", () => {
    const input = { 10: "ten", 2: "two" };

    const result = camelCaseKeys(input);

    expect(result).toEqual({ 10: "ten", 2: "two" });
  });

  it("leaves arrays unchanged when deep is false", () => {
    const input = [{ a_b: 1 }, 2, { a_b: 3 }];

    const result = camelCaseKeys(input);

    expect(result).toEqual([{ a_b: 1 }, 2, { a_b: 3 }]);
  });

  describe("deep: true (deep key mapping)", () => {
    it("maps keys inside nested plain objects", () => {
      const input = { outer_key: { inner_key: 1 } };

      const result = camelCaseKeys(input, { deep: true });

      expect(result).toEqual({ outerKey: { innerKey: 1 } });
    });

    it("maps keys inside objects nested within arrays", () => {
      const input = {
        items_key: [{ col_a: 1 }, { col_b: 2 }],
      };

      const result = camelCaseKeys(input, { deep: true });

      expect(result).toEqual({
        itemsKey: [{ colA: 1 }, { colB: 2 }],
      });
    });

    it("does not treat arrays themselves as plain objects to remap", () => {
      const input = { arr_key: [1, 2, 3] };

      const result = camelCaseKeys(input, { deep: true });

      expect(result).toEqual({ arrKey: [1, 2, 3] });
    });

    it("leaves primitive leaf values unchanged across depth", () => {
      const input = { level_key: { leaf_key: "x" } };

      const result = camelCaseKeys(input, { deep: true });

      expect(result).toEqual({ levelKey: { leafKey: "x" } });
    });

    it("does not recurse into class instances used as property values", () => {
      class Box {
        public readonly value = 1;
      }
      const box = new Box();
      const input = { boxed_box: box };

      const result = camelCaseKeys(input, { deep: true });

      expect(result).toEqual({ boxedBox: box });
    });

    it("maps keys inside an empty nested plain object", () => {
      const input = { outer_key: {} };

      const result = camelCaseKeys(input, { deep: true });

      expect(result).toEqual({ outerKey: {} });
    });

    it("maps top-level keys when nested value is an empty object", () => {
      const input = { outer_key: {} };

      const result = camelCaseKeys(input, { deep: true });

      expect(result).toEqual({ outerKey: {} });
    });
  });
});

// ============================================================================
// Type tests
// ============================================================================

describe("camelCaseKeys type tests", () => {
  it("preserves readonly input shape when keys are already camelCase", () => {
    const shallowIdentityInput = { a: 1, b: "x" } as const;
    const shallowIdentity = camelCaseKeys(shallowIdentityInput);
    expectTypeOf(shallowIdentity).toEqualTypeOf<{
      readonly a: 1;
      readonly b: "x";
    }>();
  });

  it("infers camelCase keys in the shallow result type", () => {
    const shallowRenamed = camelCaseKeys({
      foo_bar: 1,
      snake_case: "x",
    } as const);
    expectTypeOf(shallowRenamed).toEqualTypeOf({
      fooBar: 1,
      snakeCase: "x",
    } as const);
  });

  it("infers camelCase keys deeply in nested structures", () => {
    const deepRenamed = camelCaseKeys(
      {
        root_key: {
          leaf_key: true,
          nested_array: [{ col_a: 1 }],
        },
      },
      { deep: true },
    );
    expectTypeOf(deepRenamed).toEqualTypeOf({
      rootKey: {
        leafKey: true,
        nestedArray: [{ colA: 1 }],
      },
    });
  });

  it("infers camelCase keys from a const object with snake_case keys", () => {
    const narrowKeys = { alpha_key: 1, beta_key: 2 } as const;
    const narrowRemapped = camelCaseKeys(narrowKeys);
    expectTypeOf(narrowRemapped).toEqualTypeOf({
      alphaKey: 1,
      betaKey: 2,
    } as const);
  });
});
