import type {
  AllCondition,
  AnyCondition,
  NotCondition,
  WhenCondition,
} from "@plugin-manifest/WhenCondition/WhenCondition.types.ts";

/** True when `condition` is an `{ all: [...] }` combinator. */
export function isAllCondition(
  condition: WhenCondition,
): condition is AllCondition {
  return Array.isArray((condition as Partial<AllCondition>).all);
}

/** True when `condition` is an `{ any: [...] }` combinator. */
export function isAnyCondition(
  condition: WhenCondition,
): condition is AnyCondition {
  return Array.isArray((condition as Partial<AnyCondition>).any);
}

/**
 * True when `condition` is a `{ not: ... }` combinator. `all`, `any`, and
 * `not` are reserved: no slot declares a fact with those names.
 */
export function isNotCondition(
  condition: WhenCondition,
): condition is NotCondition {
  return Object.keys(condition).length === 1 && "not" in condition;
}
