import type { Merge, Module } from "@modules/Module.types.ts";
import type { EmptyObject, UnknownObject } from "@avandar/utils";

/**
 * What a mixin returns. `state` is merged into the module once, when the
 * mixin is applied. `members` are rebuilt on every state change.
 */
export type MixinResult<
  NewState extends UnknownObject = UnknownObject,
  NewMembers extends UnknownObject = UnknownObject,
> = {
  state?: NewState;
  members?: NewMembers;
};

/**
 * A mixin whose added members do not depend on the module it is applied to.
 * Type `base` with the smallest shape the mixin reads: that type is the
 * mixin's requirement, and applying the mixin to a module that does not
 * satisfy it fails to compile.
 */
export type Mixin<
  Base = unknown,
  NewState extends UnknownObject = EmptyObject,
  NewMembers extends UnknownObject = EmptyObject,
> = (base: Base) => MixinResult<NewState, NewMembers>;

/** Any mixin. The constraint for a tuple of mixins. */
export type AnyMixin = (base: never) => MixinResult;

/**
 * A type-level function for a mixin whose added members depend on the module
 * it is applied to. `this["base"]` is that module; read it in `state` and
 * `members`. An extending interface must declare all three of `requires`,
 * `state` and `members`.
 *
 * An `interface`, not a `type`, because the polymorphic `this` type this
 * relies on only exists on interfaces.
 */
export interface MixinTypeLambda {
  /** Filled in with the module the mixin is applied to. */
  readonly base: unknown;
  /** What that module must satisfy for the mixin to apply. */
  readonly requires: unknown;
  /** The state the mixin adds. */
  readonly state: UnknownObject;
  /** The members the mixin adds. */
  readonly members: UnknownObject;
}

/** A mixin branded with its type lambda. Build one with `createLambdaMixin`. */
export type LambdaMixin<Lambda extends MixinTypeLambda> = ((
  base: Lambda["requires"],
) => MixinResult) & {
  /** Type-level only. Never present at runtime. */
  readonly __mixinTypeLambda: Lambda;
};

type _LambdaOf<MixinFn> = MixinFn extends {
  readonly __mixinTypeLambda: infer Lambda extends MixinTypeLambda;
}
  ? Lambda
  : never;

type _ApplyLambda<Lambda extends MixinTypeLambda, Base> = Lambda & {
  readonly base: Base;
};

type _ReturnOf<MixinFn> = MixinFn extends (base: never) => infer Result
  ? Result
  : never;

type _PlainMixinState<MixinFn> =
  _ReturnOf<MixinFn> extends { state?: infer NewState }
    ? Exclude<NewState, undefined> extends infer Defined extends UnknownObject
      ? Defined
      : EmptyObject
    : EmptyObject;

type _PlainMixinMembers<MixinFn> =
  _ReturnOf<MixinFn> extends { members?: infer NewMembers }
    ? Exclude<NewMembers, undefined> extends infer Defined extends UnknownObject
      ? Defined
      : EmptyObject
    : EmptyObject;

/** What a mixin requires of the module it is applied to. */
export type MixinRequirement<MixinFn> = [_LambdaOf<MixinFn>] extends [never]
  ? MixinFn extends (base: infer Requirement) => unknown
    ? Requirement
    : never
  : _LambdaOf<MixinFn>["requires"];

/** The state a mixin adds when applied to `Base`. */
export type MixinState<MixinFn, Base> = [_LambdaOf<MixinFn>] extends [never]
  ? _PlainMixinState<MixinFn>
  : _ApplyLambda<_LambdaOf<MixinFn>, Base>["state"];

/** The members a mixin adds when applied to `Base`. */
export type MixinMembers<MixinFn, Base> = [_LambdaOf<MixinFn>] extends [never]
  ? _PlainMixinMembers<MixinFn>
  : _ApplyLambda<_LambdaOf<MixinFn>, Base>["members"];

/**
 * The module produced by applying `Mixins` left to right, each one seeing the
 * module built by everything before it. Tail-recursive, so TypeScript allows
 * roughly a thousand mixins.
 */
export type FoldMixins<
  Name extends string,
  State extends UnknownObject,
  Members extends UnknownObject,
  Mixins extends readonly unknown[],
> = Mixins extends readonly [infer First, ...infer Rest]
  ? FoldMixins<
      Name,
      Merge<State, MixinState<First, Module<Name, State, Members>>>,
      Merge<Members, MixinMembers<First, Module<Name, State, Members>>>,
      Rest
    >
  : Module<Name, State, Members>;

type _BuilderAnnotationHint =
  "If the missing members come from this create() call's builder, annotate the builder's parameter";

/**
 * `unknown` when every mixin's requirement is met. Otherwise an object with a
 * required `mixinRequirementNotMet` property that describes the first mixin
 * whose requirement is not met. `create`'s options lack that property, so the
 * call fails to compile and the error message names the mixin.
 */
export type MixinRequirementCheck<
  Name extends string,
  State extends UnknownObject,
  Members extends UnknownObject,
  Mixins extends readonly unknown[],
  Checked extends readonly unknown[] = [],
> = Mixins extends readonly [infer First, ...infer Rest]
  ? Module<Name, State, Members> extends MixinRequirement<First>
    ? MixinRequirementCheck<
        Name,
        Merge<State, MixinState<First, Module<Name, State, Members>>>,
        Merge<Members, MixinMembers<First, Module<Name, State, Members>>>,
        Rest,
        [...Checked, First]
      >
    : {
        readonly mixinRequirementNotMet: {
          readonly mixinIndex: Checked["length"];
          readonly moduleMustSatisfy: MixinRequirement<First>;
          readonly hint: _BuilderAnnotationHint;
        };
      }
  : unknown;
