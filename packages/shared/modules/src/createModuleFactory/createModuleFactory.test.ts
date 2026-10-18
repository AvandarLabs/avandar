import { describe, expect, expectTypeOf, it } from "vitest";
import { createLambdaMixin } from "@modules/createLambdaMixin.ts";
import { createModuleFactory } from "@modules/createModuleFactory/createModuleFactory.ts";
import { withNewMembers } from "@modules/mixins/withNewMembers/withNewMembers.ts";
import type { LambdaMixin, MixinTypeLambda } from "@modules/Mixin.types.ts";
import type { BuilderModule } from "@modules/Module.types.ts";
import type { EmptyObject } from "@avandar/utils";

type _AsyncFn = (...args: never[]) => Promise<unknown>;

type _Hooks<Base, QueryName extends string> = {
  [Key in QueryName as `use${Capitalize<Key>}`]: Key extends keyof Base
    ? Base[Key] extends (...args: infer Args) => Promise<infer Result>
      ? (...args: Args) => { data: Result | undefined }
      : never
    : never;
};

interface _HooksMixin<QueryName extends string> extends MixinTypeLambda {
  readonly requires: Record<QueryName, _AsyncFn>;
  readonly state: EmptyObject;
  readonly members: _Hooks<this["base"], QueryName>;
}

/** A stand-in for `withQueryHooks`: its members depend on the module. */
function _withHooks<const QueryName extends string>(options: {
  queryFns: readonly QueryName[];
}): LambdaMixin<_HooksMixin<QueryName>> {
  return createLambdaMixin<_HooksMixin<QueryName>>((base) => {
    const hookEntries = options.queryFns.map((queryFn) => {
      if (typeof base[queryFn] !== "function") {
        throw new Error(`No query function named "${queryFn}".`);
      }
      const hookName = `use${queryFn.charAt(0).toUpperCase()}${queryFn.slice(1)}`;
      return [
        hookName,
        () => {
          return { data: undefined };
        },
      ] as const;
    });
    return { members: Object.fromEntries(hookEntries) };
  });
}

type _CounterState = { count: number };

const CounterFactory = createModuleFactory("Counter", {
  defaultState: {},
  builder: (module: BuilderModule<_CounterState>) => {
    return {
      describe: (): string => {
        return `${module.getModuleName()}: ${module.getCount()}`;
      },
    };
  },
});

const ServiceFactory = createModuleFactory("Service", {
  defaultState: {},
  builder: (module: BuilderModule) => {
    return {
      getServiceName: (): string => {
        return module.getModuleName();
      },
    };
  },
});

/** A plain mixin that requires a `getCount` accessor on its base. */
function _withDoubled() {
  return (base: { getCount(): number }) => {
    return {
      members: {
        doubled: (): number => {
          return base.getCount() * 2;
        },
      },
    };
  };
}

describe("createModuleFactory: the factory", () => {
  it("is named after the kind", () => {
    expect(CounterFactory.getModuleName()).toBe("CounterFactory");
  });
});

describe("createModuleFactory: create", () => {
  it("gives the created module the name passed to create", () => {
    const counter = CounterFactory.create("Steps", { state: { count: 0 } });
    expectTypeOf(counter.getModuleName()).toEqualTypeOf<"Steps">();
    expect(counter.getModuleName()).toBe("Steps");
  });

  it("gives the created module the kind's members", () => {
    const counter = CounterFactory.create("Steps", { state: { count: 3 } });
    expect(counter.describe()).toBe("Steps: 3");
  });

  it("builds the create builder's members after the kind's, so they can call them", () => {
    const counter = CounterFactory.create("Steps", {
      state: { count: 1 },
      builder: (
        module: BuilderModule<_CounterState, { describe(): string }>,
      ) => {
        return {
          shout: (): string => {
            return module.describe().toUpperCase();
          },
        };
      },
    });
    expect(counter.shout()).toBe("STEPS: 1");
  });

  it("keeps the kind's members after a setter, reading the new state", () => {
    const counter = CounterFactory.create("Steps", { state: { count: 1 } });
    expect(counter.setCount(9).describe()).toBe("Steps: 9");
  });

  it("keeps a create-time mixin's members after a setter", () => {
    const counter = CounterFactory.create("Steps", {
      state: { count: 2 },
      mixins: [_withDoubled()],
    });
    expect(counter.setCount(5).doubled()).toBe(10);
  });

  it("lets a created module take further mixins", () => {
    const counter = CounterFactory.create("Steps", {
      state: { count: 2 },
    }).mixin(_withDoubled());
    expect(counter.doubled()).toBe(4);
  });

  it("gives an optional state key its default, so its accessors exist", () => {
    const LabelFactory = createModuleFactory("Label", {
      defaultState: { label: undefined },
      builder: (module: BuilderModule<{ label?: string }>) => {
        return {
          read: (): string => {
            return module.getLabel() ?? "none";
          },
        };
      },
    });
    expect(LabelFactory.create("L", {}).setLabel("set").read()).toBe("set");
  });

  it("lets create's state override a default", () => {
    const LabelFactory = createModuleFactory("Label", {
      defaultState: { label: "default" },
      builder: (module: BuilderModule<{ label?: string }>) => {
        return {
          read: (): string | undefined => {
            return module.getLabel();
          },
        };
      },
    });
    expect(LabelFactory.create("L", { state: { label: "given" } }).read()).toBe(
      "given",
    );
  });

  it("accepts no state when the kind's state has no required keys", () => {
    const service = ServiceFactory.create("Users", {});
    expect(service.getServiceName()).toBe("Users");
  });
});

describe("createModuleFactory: mixins", () => {
  it("applies mixins left to right, each seeing the members added before it", () => {
    const service = ServiceFactory.create("Users", {
      mixins: [
        withNewMembers({
          getUsers: async (): Promise<string[]> => {
            return [];
          },
        }),
        _withHooks({ queryFns: ["getUsers"] }),
      ],
    });
    expect(service.useGetUsers()).toEqual({ data: undefined });
  });

  it("types a lambda mixin's members from the members it wraps", () => {
    const service = ServiceFactory.create("Users", {
      builder: () => {
        return {
          getProfile: async (_params: {
            id: string;
          }): Promise<{ email: string }> => {
            return { email: "a@b.c" };
          },
        };
      },
      mixins: [_withHooks({ queryFns: ["getProfile"] })],
    });
    expectTypeOf(service.useGetProfile).parameter(0).toEqualTypeOf<{
      id: string;
    }>();
    expectTypeOf(service.useGetProfile).returns.toEqualTypeOf<{
      data: { email: string } | undefined;
    }>();
    expect(service.useGetProfile({ id: "1" })).toEqual({ data: undefined });
  });

  it("applies a long tuple of mixins with every member typed", () => {
    const service = ServiceFactory.create("Many", {
      mixins: [
        withNewMembers({
          m1: (): "m1" => {
            return "m1";
          },
        }),
        withNewMembers({
          m2: (): "m2" => {
            return "m2";
          },
        }),
        withNewMembers({
          m3: (): "m3" => {
            return "m3";
          },
        }),
        withNewMembers({
          m4: (): "m4" => {
            return "m4";
          },
        }),
        withNewMembers({
          m5: (): "m5" => {
            return "m5";
          },
        }),
        withNewMembers({
          m6: (): "m6" => {
            return "m6";
          },
        }),
        withNewMembers({
          m7: (): "m7" => {
            return "m7";
          },
        }),
        withNewMembers({
          m8: (): "m8" => {
            return "m8";
          },
        }),
        withNewMembers({
          m9: (): "m9" => {
            return "m9";
          },
        }),
        withNewMembers({
          m10: (): "m10" => {
            return "m10";
          },
        }),
        withNewMembers({
          m11: (): "m11" => {
            return "m11";
          },
        }),
        withNewMembers({
          m12: (): "m12" => {
            return "m12";
          },
        }),
      ],
    });
    expectTypeOf(service.m12).returns.toEqualTypeOf<"m12">();
    expect([service.m1(), service.m12()]).toEqual(["m1", "m12"]);
  });

  it("refuses a mixin whose requirement the module does not meet", () => {
    expect(() => {
      // @ts-expect-error - a Service has no getCount accessor
      ServiceFactory.create("NoCount", { mixins: [_withDoubled()] }).doubled();
    }).toThrow();
  });

  it("refuses a lambda mixin wrapping a member the module lacks", () => {
    expect(() => {
      // @ts-expect-error - getNothing is not a member
      ServiceFactory.create("NoQuery", {
        mixins: [_withHooks({ queryFns: ["getNothing"] })],
      });
    }).toThrow(/getNothing/);
  });

  it("refuses a lambda mixin placed before the mixin that adds its member", () => {
    expect(() => {
      // @ts-expect-error - getUsers does not exist yet when _withHooks runs
      ServiceFactory.create("WrongOrder", {
        mixins: [
          _withHooks({ queryFns: ["getUsers"] }),
          withNewMembers({
            getUsers: async () => {
              return [];
            },
          }),
        ],
      });
    }).toThrow(/getUsers/);
  });
});
