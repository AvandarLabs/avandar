import { getValue } from "@utils/objects/getValue/getValue.ts";
import { describe, expect, it } from "vitest";
import type {
  ObjectPaths,
  ObjectPathValue,
} from "@utils/objects/ObjectPaths/ObjectPaths.types.ts";
import type { Expect } from "@utils/types/testUtilities.types.ts";
import type { IsEqual } from "type-fest";

/**
 * Stands in for a DOM element. `@avandar/utils` compiles with `lib: ESNext`
 * and has no DOM types, so this reproduces the shape that matters: a
 * behavior-carrying object that reaches itself through its own properties,
 * exactly as every DOM node reaches every other through `parentNode`.
 */
type FakeElement = {
  offsetWidth: number;
  parentNode: FakeElement | null;
  ownerDocument: FakeDocument;
  addEventListener: (type: string) => void;
  removeEventListener: (type: string) => void;
  getBoundingClientRect: () => { width: number };
};

type FakeDocument = {
  body: FakeElement;
  createElement: (tag: string) => FakeElement;
  querySelector: (selector: string) => FakeElement | null;
};

/**
 * A data record that holds a single callback, the shape of `AppLink`. This
 * must stay pathable: `prop("link.to")` in the navbar tests depends on it,
 * and it is the case that separates "carries behavior" from "is data".
 */
type FakeAppLink = {
  to: string;
  label: () => string;
};

/**
 * Type-level assertions. These are the real test: each one fails to compile
 * if the path union is wrong, and the unbounded cases would hang `tsc`
 * outright rather than produce a wrong answer.
 */
export type ObjectPathsTypeTests = [
  // Plain records enumerate every dotted path.
  Expect<
    IsEqual<
      ObjectPaths<{ dataset: { id: string }; name: string }>,
      "dataset" | "dataset.id" | "name"
    >
  >,
  // A behavior-carrying value is a leaf. Without this guard the union is
  // unbounded and the compiler never returns.
  Expect<IsEqual<ObjectPaths<{ current: FakeElement | null }>, "current">>,
  Expect<IsEqual<ObjectPaths<{ element: FakeElement }>, "element">>,
  // One callback does not make a record opaque.
  Expect<
    IsEqual<
      ObjectPaths<{ link: FakeAppLink }>,
      "link" | "link.to" | "link.label"
    >
  >,
  Expect<IsEqual<ObjectPathValue<{ link: FakeAppLink }, "link.to">, string>>,
  // Arrays are descended through a `${number}` segment. `useForm` relies on
  // this to type field keys like `layers.0.name`, so it must not regress.
  Expect<
    IsEqual<
      ObjectPaths<{ items: Array<{ id: string }> }>,
      "items" | `items.${number}` | `items.${number}.id`
    >
  >,
  Expect<
    IsEqual<
      ObjectPathValue<{ items: Array<{ id: string }> }, `items.${number}.id`>,
      string
    >
  >,
  Expect<
    IsEqual<
      ObjectPathValue<{ items: Array<{ id: string }> }, "items.0.id">,
      string
    >
  >,
  // An array of behavior-carrying values still stops at the index.
  Expect<
    IsEqual<ObjectPaths<{ nodes: FakeElement[] }>, "nodes" | `nodes.${number}`>
  >,
  // Optional records are still descended into.
  Expect<
    IsEqual<
      ObjectPaths<{ boundary?: { datasetId: string } }>,
      "boundary" | "boundary.datasetId"
    >
  >,

  Expect<IsEqual<ObjectPathValue<{ id: string }, "id">, string>>,
  Expect<
    IsEqual<ObjectPathValue<{ dataset: { id: number } }, "dataset.id">, number>
  >,
  Expect<
    IsEqual<
      ObjectPathValue<
        { boundary?: { datasetId: string } },
        "boundary.datasetId"
      >,
      string
    >
  >,
];

describe("ObjectPaths", () => {
  it("keeps dotted-path reads working at runtime", () => {
    const value = getValue({ dataset: { id: "abc" } }, "dataset.id");
    expect(value).toBe("abc");
  });

  it("keeps single-key reads working at runtime", () => {
    expect(getValue({ id: "abc" }, "id")).toBe("abc");
  });
});
