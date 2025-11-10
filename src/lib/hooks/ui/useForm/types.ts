import { UseFormReturnType as MantineUseFormReturnType } from "@mantine/form";
import { Merge, Paths } from "type-fest";
import { UnknownObject } from "@/lib/types/common";
import { PathValue } from "@/lib/utils/objects/getValue";
import {
  GetInputPropsOptions,
  GetInputPropsReturnType,
  GetKeyAndPropsFn,
} from "./useKeysAndPropsCallback";

type InsertListItemFn<FormValues extends UnknownObject> = <
  P extends keyof FormValues,
  ItemType extends FormValues[P] extends ReadonlyArray<infer V> ? V : never,
>(
  path: P,
  item: ItemType,
) => void;

type RemoveListItemFn<FormValues extends UnknownObject> = <
  P extends keyof FormValues,
>(
  path: P,
  index: number,
) => void;

/**
 * An improved version of Mantine's `UseFormReturnType` with
 * significantly better type safety.
 */
export type FormType<
  FormValues extends UnknownObject,
  TransformedValues = FormValues,
  FormPath extends Paths<FormValues> = Paths<FormValues>,
> = Merge<
  Omit<
    MantineUseFormReturnType<
      FormValues,
      (values: FormValues) => TransformedValues
    >,
    // remove `values` so that we don't mistakenly use it. We should always
    // use `getValues` instead.
    "values"
  >,
  {
    // Improve type-safety for `key`
    key: (path: FormPath) => string;

    // Improve type-safety for `setFieldValue`
    setFieldValue: <P extends FormPath>(
      path: P,
      value:
        | PathValue<FormValues, P>
        | ((prevValue: PathValue<FormValues, P>) => PathValue<FormValues, P>),
      options?: {
        forceUpdate: boolean;
      },
    ) => void;

    // Improve type-safety for `getInputProps`
    getInputProps: (
      path: FormPath,
      options?: GetInputPropsOptions,
    ) => GetInputPropsReturnType;

    /**
     * Improved type-safety for Mantine's `form.watch`
     * @deprecated Use `useFieldWatch` instead
     */
    watch: <P extends FormPath>(
      path: P,
      subscriberFn: (payload: {
        previousValue: PathValue<FormValues, P>;
        value: PathValue<FormValues, P>;
        touched: boolean;
        dirty: boolean;
      }) => void,
    ) => void;

    /**
     * Improved type-safety for Mantine's `form.watch`
     *
     * This is an alias for Mantine's `form.watch`. The new name makes it
     * clearer that this function is a React hook.
     */
    useFieldWatch: <P extends FormPath>(
      path: P,
      subscriberFn: (payload: {
        previousValue: PathValue<FormValues, P>;
        value: PathValue<FormValues, P>;
        touched: boolean;
        dirty: boolean;
      }) => void,
    ) => void;

    // Improve type-safety for `insertListItem`
    insertListItem: InsertListItemFn<FormValues>;

    // Improve type-safety for `removeListItem`
    removeListItem: RemoveListItemFn<FormValues>;

    // Our own helper function to get `keys` and `props` bound to a base path
    keysAndProps: GetKeyAndPropsFn<FormValues, FormPath>;
  }
>;
