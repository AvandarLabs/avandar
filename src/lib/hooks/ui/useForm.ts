import {
  useForm as mantineUseForm,
  UseFormInput,
  UseFormReturnType,
} from "@mantine/form";
import { useCallback } from "react";
import { UnknownObject } from "@/lib/types/common";

type InsertListItemFn<FormValues extends UnknownObject> = <
  P extends keyof FormValues,
  ItemType extends FormValues[P] extends ReadonlyArray<infer V> ? V : never,
>(
  path: P,
  item: ItemType,
) => void;

/**
 * useForm extends the functionality of the mantine useForm hook by adding
 * a tuple of form setters with improved type safety.
 *
 * ```ts
 * const [form, setForm] = useForm<Values>(formOptions);
 * setForm.insertListItem("fields", newField);
 * ```
 *
 * @param formOptions - The options for the form.
 * @returns A tuple of the form and an object of form setters
 */
export function useForm<
  FormValues extends UnknownObject,
  TransformValues extends (values: FormValues) => unknown = (
    values: FormValues,
  ) => FormValues,
>(
  formOptions: UseFormInput<FormValues, TransformValues>,
): [
  UseFormReturnType<FormValues, TransformValues>,
  {
    insertListItem: InsertListItemFn<FormValues>;
  },
] {
  const form = mantineUseForm<FormValues, TransformValues>(formOptions);
  const insertListItem: InsertListItemFn<FormValues> = useCallback(
    (path, item) => {
      form.insertListItem(path, item);
    },
    [form],
  );

  return [form, { insertListItem }];
}
