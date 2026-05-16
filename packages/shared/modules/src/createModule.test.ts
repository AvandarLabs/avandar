import { createModule } from "@modules/createModule.ts";
import { withNewMembers } from "@modules/mixins/withNewMembers/withNewMembers.ts";
import { describe, expect, it } from "vitest";

describe("createModule mixin cumulativeness", () => {
  it("preserves members from the object mixin is invoked on (wide receiver)", () => {
    const base = createModule("WideReceiver", {
      builder: () => {
        return {
          onlyBase: (): string => {
            return "base";
          },
        };
      },
    });

    const wide = {
      ...base,
      extraLayer: (): string => {
        return "extra";
      },
    };

    const mixed = wide.mixin(
      withNewMembers({
        fromMixin: (): string => {
          return "mixin";
        },
      }),
    );

    const mixedMembers = mixed as Record<string, unknown>;

    expect(mixed.onlyBase()).toBe("base");
    expect(typeof mixedMembers.extraLayer).toBe("function");
    expect((mixedMembers.extraLayer as () => string)()).toBe("extra");
    expect(mixed.fromMixin()).toBe("mixin");
  });

  it("passes the full receiver into the mixin callback", () => {
    const base = createModule("MixinArg", {
      builder: () => {
        return {
          alpha: (): number => {
            return 1;
          },
        };
      },
    });

    const wide = {
      ...base,
      beta: (): number => {
        return 2;
      },
    };

    const mixed = wide.mixin((prev) => {
      const prevMembers = prev as Record<string, unknown>;
      expect(typeof prevMembers.alpha).toBe("function");
      expect(typeof prevMembers.beta).toBe("function");
      return {
        members: {
          gamma: (): number => {
            return 3;
          },
        },
      };
    });

    const mixedMembers = mixed as Record<string, unknown>;

    expect(mixed.alpha()).toBe(1);
    expect(typeof mixedMembers.beta).toBe("function");
    expect((mixedMembers.beta as () => number)()).toBe(2);
    expect(mixed.gamma()).toBe(3);
  });

  it("chains mixins without dropping prior mixin members", () => {
    const base = createModule("Chain", {
      builder: () => {
        return {
          a: (): string => {
            return "a";
          },
        };
      },
    });

    const first = base.mixin(
      withNewMembers({
        b: (): string => {
          return "b";
        },
      }),
    );

    const second = first.mixin(
      withNewMembers({
        c: (): string => {
          return "c";
        },
      }),
    );

    expect(second.a()).toBe("a");
    expect(second.b()).toBe("b");
    expect(second.c()).toBe("c");
  });

  it("merges mixin state with prior module state", () => {
    const base = createModule("Stateful", {
      state: { count: 1 },
      builder: () => {
        return {
          read: (): number => {
            return 0;
          },
        };
      },
    });

    const extended = base.mixin(() => {
      return { state: { count: 2 } as { count: number } };
    });

    expect(extended.getState().count).toBe(2);
  });
});
