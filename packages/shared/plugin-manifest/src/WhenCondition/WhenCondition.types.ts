/** A comparison operator a `when` condition can apply to a fact. */
export type WhenOperator = "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in";

/** A value a contribution slot exposes as a fact. */
export type FactValue = string | number | boolean;

/** Facts a slot exposes to `when` conditions, keyed by fact name. */
export type WhenFacts = Readonly<Record<string, FactValue>>;

/**
 * A comparison against one fact, such as `{ rowCount: { gt: 0 } }`. Schema
 * validation guarantees exactly one fact per comparison.
 */
export type FactComparison = Readonly<
  Record<
    string,
    Readonly<Partial<Record<WhenOperator, FactValue | readonly FactValue[]>>>
  >
>;

/** Every condition in `all` must hold. */
export type AllCondition = Readonly<{ all: readonly WhenCondition[] }>;

/** At least one condition in `any` must hold. */
export type AnyCondition = Readonly<{ any: readonly WhenCondition[] }>;

/** The condition in `not` must not hold. */
export type NotCondition = Readonly<{ not: WhenCondition }>;

/** A declarative condition deciding whether a contribution is shown. */
export type WhenCondition =
  | AllCondition
  | AnyCondition
  | NotCondition
  | FactComparison;
