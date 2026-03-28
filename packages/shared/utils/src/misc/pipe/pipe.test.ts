import { describe, expect, it } from "vitest";
import { pipe } from "@utils/misc/pipe/pipe.ts";
import type { Expect, IsEqual } from "@utils/types/test-utilities.types.ts";

describe("pipe", () => {
  it("composes two functions left to right", () => {
    const double = (n: number) => {
      return n * 2;
    };
    const addOne = (n: number) => {
      return n + 1;
    };

    const fn = pipe(double, addOne);
    expect(fn(3)).toBe(7);
  });

  it("composes three functions left to right", () => {
    const fn = pipe(
      (n: number) => {
        return n + 1;
      },
      (n: number) => {
        return n * 10;
      },
      (n: number) => {
        return `result:${n}`;
      },
    );
    expect(fn(2)).toBe("result:30");
  });

  it("composes four functions left to right", () => {
    const fn = pipe(
      (s: string) => {
        return s.trim();
      },
      (s: string) => {
        return s.toUpperCase();
      },
      (s: string) => {
        return s.split(" ");
      },
      (words: string[]) => {
        return words.length;
      },
    );
    expect(fn("  hello world  ")).toBe(2);
  });

  it("composes five functions left to right", () => {
    const fn = pipe(
      (n: number) => {
        return n + 1;
      },
      (n: number) => {
        return n * 2;
      },
      (n: number) => {
        return n - 3;
      },
      (n: number) => {
        return n / 5;
      },
      (n: number) => {
        return n.toFixed(1);
      },
    );
    expect(fn(4)).toBe("1.4");
  });

  it("composes six functions left to right", () => {
    const fn = pipe(
      (s: string) => {
        return s.split(",");
      },
      (arr: string[]) => {
        return arr.map((x) => {
          return x.trim();
        });
      },
      (arr: string[]) => {
        return arr.filter((x) => {
          return x.length > 0;
        });
      },
      (arr: string[]) => {
        return arr.map(Number);
      },
      (arr: number[]) => {
        return arr.reduce((a, b) => {
          return a + b;
        }, 0);
      },
      (n: number) => {
        return n > 10;
      },
    );
    expect(fn("1, 2, 3, 4, 5")).toBe(true);
    expect(fn("1, 2, 3")).toBe(false);
  });

  it("composes seven functions left to right", () => {
    const fn = pipe(
      (n: number) => {
        return n * 2;
      },
      (n: number) => {
        return n + 1;
      },
      (n: number) => {
        return String(n);
      },
      (s: string) => {
        return s.padStart(5, "0");
      },
      (s: string) => {
        return `ID-${s}`;
      },
      (s: string) => {
        return s.toLowerCase();
      },
      (s: string) => {
        return { id: s };
      },
    );
    expect(fn(42)).toEqual({ id: "id-00085" });
  });

  it("passes the input through each function in order", () => {
    const calls: number[] = [];
    const fn = pipe(
      (n: number) => {
        calls.push(1);
        return n;
      },
      (n: number) => {
        calls.push(2);
        return n;
      },
      (n: number) => {
        calls.push(3);
        return n;
      },
    );

    fn(0);
    expect(calls).toEqual([1, 2, 3]);
  });

  it("handles type transformations across steps", () => {
    const fn = pipe(
      (n: number) => {
        return [n];
      },
      (arr: number[]) => {
        return new Set(arr);
      },
      (set: Set<number>) => {
        return set.size;
      },
    );
    expect(fn(42)).toBe(1);
  });
});

// ============================================================================
// Type tests
// ============================================================================

const twoFns = pipe(
  (n: number) => {
    return String(n);
  },
  (s: string) => {
    return s.length;
  },
);

const threeFns = pipe(
  (n: number) => {
    return [n];
  },
  (arr: number[]) => {
    return arr.join(",");
  },
  (s: string) => {
    return s === "1";
  },
);

const fourFns = pipe(
  (s: string) => {
    return s.length;
  },
  (n: number) => {
    return n > 0;
  },
  (b: boolean) => {
    return [b];
  },
  (arr: boolean[]) => {
    return new Set(arr);
  },
);

const fiveFns = pipe(
  (n: number) => {
    return { value: n };
  },
  (obj: { value: number }) => {
    return obj.value;
  },
  (n: number) => {
    return String(n);
  },
  (s: string) => {
    return s.split("");
  },
  (arr: string[]) => {
    return arr.length;
  },
);

const sixFns = pipe(
  (n: number) => {
    return n + 1;
  },
  (n: number) => {
    return String(n);
  },
  (s: string) => {
    return [s];
  },
  (arr: string[]) => {
    return arr.join("");
  },
  (s: string) => {
    return s.length;
  },
  (n: number) => {
    return n > 0;
  },
);

const sevenFns = pipe(
  (s: string) => {
    return s.length;
  },
  (n: number) => {
    return n * 2;
  },
  (n: number) => {
    return String(n);
  },
  (s: string) => {
    return [s];
  },
  (arr: string[]) => {
    return new Set(arr);
  },
  (set: Set<string>) => {
    return set.size;
  },
  (n: number) => {
    return { count: n };
  },
);

// @ts-expect-error allow unused variable declaration.
type TypeTests = [
  // pipe with 2 fns: (number) => number
  Expect<IsEqual<typeof twoFns, (input: number) => number>>,

  // pipe with 3 fns: (number) => boolean
  Expect<IsEqual<typeof threeFns, (input: number) => boolean>>,

  // pipe with 4 fns: (string) => Set<boolean>
  Expect<IsEqual<typeof fourFns, (input: string) => Set<boolean>>>,

  // pipe with 5 fns: (number) => number
  Expect<IsEqual<typeof fiveFns, (input: number) => number>>,

  // pipe with 6 fns: (number) => boolean
  Expect<IsEqual<typeof sixFns, (input: number) => boolean>>,

  // pipe with 7 fns: (string) => { count: number }
  Expect<IsEqual<typeof sevenFns, (input: string) => { count: number }>>,
];
