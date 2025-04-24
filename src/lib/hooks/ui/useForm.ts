import {
  useForm as mantineUseForm,
  UseFormReturnType as MantineUseFormReturnType,
  UseFormInput,
} from "@mantine/form";
import { useCallback } from "react";
import { Merge, Paths, UnknownArray } from "type-fest";
import { UnknownObject } from "@/lib/types/common";
import { IdentityTypeFn } from "@/lib/types/utilityTypes";

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

type InsertListItemFn<FormValues extends UnknownObject> = <
  P extends keyof FormValues,
  ItemType extends FormValues[P] extends ReadonlyArray<infer V> ? V : never,
>(
  path: P,
  item: ItemType,
) => void;

/**
 * An improved version of Mantine's `UseFormReturnType` with
 * significantly better type safety.
 */
export type FormType<
  FormValues extends UnknownObject,
  TransformedValues extends (
    values: FormValues,
  ) => unknown = IdentityTypeFn<FormValues>,
  FormPaths extends Paths<FormValues> = Paths<FormValues>,
> = Merge<
  MantineUseFormReturnType<FormValues, TransformedValues>,
  {
    key: (path: FormPaths) => string;
    watch: <P extends FormPaths>(
      path: P,
      subscriberFn: (payload: {
        previousValue: PathValue<FormValues, P>;
        value: PathValue<FormValues, P>;
        touched: boolean;
        dirty: boolean;
      }) => void,
    ) => void;
  }
>;

export type FormSetters<FormValues extends UnknownObject> = {
  insertListItem: InsertListItemFn<FormValues>;
};

/**
 * `useForm` extends the functionality of the mantine useForm hook by adding
 * a tuple of `form` and a `formSetters` object with improved type safety.
 *
 * ```ts
 * const [form, formSetters] = useForm<Values>(formOptions);
 * formSetters.insertListItem("fields", newField);
 * ```
 *
 * @param formOptions - The options for the form.
 * @returns A tuple of [form, formSetters]
 */
export function useForm<
  FormValues extends UnknownObject,
  TransformValues extends (
    values: FormValues,
  ) => unknown = IdentityTypeFn<FormValues>,
>(
  formOptions: UseFormInput<FormValues, TransformValues>,
): [FormType<FormValues, TransformValues>, FormSetters<FormValues>] {
  const form = mantineUseForm<FormValues, TransformValues>(formOptions);
  const insertListItem: InsertListItemFn<FormValues> = useCallback(
    (path, item) => {
      form.insertListItem(path, item);
    },
    [form],
  );

  return [form as FormType<FormValues, TransformValues>, { insertListItem }];
}
