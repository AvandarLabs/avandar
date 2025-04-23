import {
  useForm as mantineUseForm,
  UseFormReturnType as MantineUseFormReturnType,
  UseFormInput,
} from "@mantine/form";
import { useCallback } from "react";
import { Merge, Paths } from "type-fest";
import { UnknownObject } from "@/lib/types/common";
import { IdentityFunction } from "@/lib/types/utilityTypes";

type InsertListItemFn<FormValues extends UnknownObject> = <
  P extends keyof FormValues,
  ItemType extends FormValues[P] extends ReadonlyArray<infer V> ? V : never,
>(
  path: P,
  item: ItemType,
) => void;

/**
 * An improved version of Mantine's `UseFormReturnType` with
 * better type safety.
 */
export type FormType<
  FormValues extends UnknownObject,
  TransformValues extends (
    values: FormValues,
  ) => unknown = IdentityFunction<FormValues>,
  FormPaths extends Paths<FormValues> = Paths<FormValues>,
> = Merge<
  MantineUseFormReturnType<FormValues, TransformValues>,
  {
    key: (path: FormPaths) => string;
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
  ) => unknown = IdentityFunction<FormValues>,
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

  return [form, { insertListItem }];
}
