import { UseFormReturnType as MantineUseFormReturnType } from "@mantine/form";
import { Merge, Paths, UnknownArray } from "type-fest";
import { UnknownObject } from "@/lib/types/common";
import { IdentityFnType } from "@/lib/types/utilityTypes";
import { GetKeyAndPropsFn } from "./useKeysAndPropsCallback";

/**
 * Gets the type of a value from an object given a key path in
 * dot notation.
 */
type PathValue<T, P extends Paths<T>> =
  P extends `${infer K}.${infer Rest}` ?
    K extends keyof T ?
      Rest extends Paths<T[K]> ?
        PathValue<T[K], Rest>
      : never
    : K extends `${number}` ?
      T extends UnknownArray ?
        Rest extends Paths<T[number]> ?
          PathValue<T[number], Rest>
        : never
      : never
    : never
  : // evaluate the final key. Check if this is an array access.
  P extends `${number}` ?
    T extends UnknownArray ?
      T[number]
    : never
  : // else, check if this is a valid key in T we can access
  P extends keyof T ? T[P]
  : never;

/**
 * An improved version of Mantine's `UseFormReturnType` with
 * significantly better type safety.
 */
export type FormType<
  FormValues extends UnknownObject,
  TransformedValues extends (
    values: FormValues,
  ) => unknown = IdentityFnType<FormValues>,
  FormPath extends Paths<FormValues> = Paths<FormValues>,
> = Merge<
  MantineUseFormReturnType<FormValues, TransformedValues>,
  {
    // Improve type-safety for `key`
    key: (path: FormPath) => string;

    // Improve type-safety for `watch`
    watch: <P extends FormPath>(
      path: P,
      subscriberFn: (payload: {
        previousValue: PathValue<FormValues, P>;
        value: PathValue<FormValues, P>;
        touched: boolean;
        dirty: boolean;
      }) => void,
    ) => void;

    // Our own helper function to get `keys` and `props` bound to a base path
    keysAndProps: GetKeyAndPropsFn<FormValues, FormPath>;
  }
>;
