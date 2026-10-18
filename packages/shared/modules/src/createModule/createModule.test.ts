import { describe, expect, expectTypeOf, it } from "vitest";
import { createModule } from "@modules/createModule/createModule.ts";
import { withNewMembers } from "@modules/mixins/withNewMembers/withNewMembers.ts";

function _createCounter() {
  return createModule("Counter", {
    state: { count: 0 },
    builder: (module) => {
      return {
        increment: () => {
          return module.setCount((count) => {
            return count + 1;
          });
        },
      };
    },
  });
}

describe("createModule: generated accessors", () => {
  it("getCount returns the count state value", () => {
    expect(_createCounter().getCount()).toBe(0);
  });

  it("setCount returns a module holding the new value", () => {
    expect(_createCounter().setCount(5).getCount()).toBe(5);
  });

  it("setCount leaves the original module's state unchanged", () => {
    const counter = _createCounter();
    counter.setCount(5);
    expect(counter.getCount()).toBe(0);
  });

  it("setCount passes the current value to an updater function", () => {
    const counter = _createCounter().setCount(2);
    expect(
      counter
        .setCount((count) => {
          return count * 10;
        })
        .getCount(),
    ).toBe(20);
  });

  it("set writes a value at a dot-notation path", () => {
    const module = createModule("Nested", { state: { inner: { value: 1 } } });
    expect(module.set("inner.value", 2).getInner().value).toBe(2);
  });

  it("setState merges a partial state over the current one", () => {
    const module = createModule("Pair", { state: { left: 1, right: 2 } });
    expect(module.setState({ right: 3 }).getState()).toEqual({
      left: 1,
      right: 3,
    });
  });

  it("getModuleName returns the name the module was created with", () => {
    expectTypeOf(_createCounter().getModuleName()).toEqualTypeOf<"Counter">();
    expect(_createCounter().getModuleName()).toBe("Counter");
  });
});

describe("createModule: rebuilding on state changes", () => {
  it("a member reads the state of the module it was rebuilt for", () => {
    expect(_createCounter().setCount(5).increment().getCount()).toBe(6);
  });

  it("a mixin's members are still present after a setter", () => {
    const counter = _createCounter().mixin(
      withNewMembers({
        ping: (): string => {
          return "pong";
        },
      }),
    );
    expect(counter.setCount(3).ping()).toBe("pong");
  });

  it("a mixin's member reads the current state after a setter", () => {
    const counter = _createCounter().mixin((base) => {
      return {
        members: {
          describe: (): string => {
            return `count: ${base.getCount()}`;
          },
        },
      };
    });
    expect(counter.setCount(4).describe()).toBe("count: 4");
  });

  it("a member built before a mixin returns a module that still has the mixin's members", () => {
    const counter = _createCounter().mixin(
      withNewMembers({
        ping: (): string => {
          return "pong";
        },
      }),
    );
    expect("ping" in counter.increment()).toBe(true);
  });

  it("a mixin's state is added to the module when the mixin is applied", () => {
    const labeled = _createCounter().mixin(() => {
      return { state: { label: "a" } };
    });
    expect(labeled.getLabel()).toBe("a");
  });

  it("a mixin's state is not reapplied after a setter changes it", () => {
    const labeled = _createCounter().mixin(() => {
      return { state: { label: "a" } };
    });
    expect(labeled.setLabel("b").setCount(1).getLabel()).toBe("b");
  });

  it("a later layer's member replaces an earlier member of the same name", () => {
    const module = createModule("Override", {
      builder: () => {
        return {
          value: (): number => {
            return 1;
          },
        };
      },
    }).mixin(() => {
      return {
        members: {
          value: (): string => {
            return "two";
          },
        },
      };
    });
    expectTypeOf(module.value).returns.toEqualTypeOf<string>();
    expect(module.value()).toBe("two");
  });
});

describe("createModule: immutability and reserved names", () => {
  it("freezes the module object", () => {
    expect(Object.isFrozen(_createCounter())).toBe(true);
  });

  it("freezes the state object", () => {
    expect(Object.isFrozen(_createCounter().getState())).toBe(true);
  });

  it("throws when a builder defines a reserved member name", () => {
    expect(() => {
      createModule("Reserved", {
        // @ts-expect-error - getState is reserved
        builder: () => {
          return { getState: () => {} };
        },
      });
    }).toThrow(/reserved/);
  });

  it("throws when a mixin adds a reserved member name", () => {
    expect(() => {
      _createCounter().mixin(() => {
        return { members: { mixin: 1 } };
      });
    }).toThrow(/reserved/);
  });

  it("throws when the state has a key whose accessors would be reserved", () => {
    expect(() => {
      // @ts-expect-error - "state" would generate getState and setState
      createModule("BadState", { state: { state: 1 } });
    }).toThrow(/state key named "state"/);
  });
});

describe("createModule: members attached by spreading", () => {
  it("keeps members spread onto a copy of the module when a mixin is applied", () => {
    const spread = {
      ..._createCounter(),
      extra: (): string => {
        return "extra";
      },
    };
    const mixed = spread.mixin(withNewMembers({ fromMixin: () => {} }));
    expect((mixed as Record<string, unknown>).extra).toBe(spread.extra);
  });

  it("passes members spread onto a copy of the module to the mixin's base", () => {
    const spread = {
      ..._createCounter(),
      extra: (): string => {
        return "extra";
      },
    };
    let baseHadExtra = false;
    spread.mixin((base) => {
      baseHadExtra = "extra" in base;
      return {};
    });
    expect(baseHadExtra).toBe(true);
  });
});
