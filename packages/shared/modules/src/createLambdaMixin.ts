import type {
  LambdaMixin,
  MixinResult,
  MixinTypeLambda,
} from "@modules/Mixin.types.ts";

/**
 * Brands a mixin function with its type lambda, for a mixin whose added
 * members depend on the module it is applied to.
 *
 * @param mixinFn - The mixin. Its `base` is typed as the lambda's `requires`.
 * @returns The same function, typed as a `LambdaMixin`.
 */
export function createLambdaMixin<Lambda extends MixinTypeLambda>(
  mixinFn: (base: Lambda["requires"]) => MixinResult,
): LambdaMixin<Lambda> {
  // The brand is a phantom property: it exists only in the type.
  return mixinFn as LambdaMixin<Lambda>;
}
