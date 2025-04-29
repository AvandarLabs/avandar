import {
  FormErrors,
  formRootRule,
  useForm as mantineUseForm,
  UseFormInput as MantineUseFormInput,
} from "@mantine/form";
import { useCallback } from "react";
import { Merge, Paths } from "type-fest";
import { UnknownObject } from "@/lib/types/common";
import { IdentityFnType } from "@/lib/types/utilityTypes";
import { FormType } from "./useFormTypes";
import { useKeysAndPropsCallback } from "./useKeysAndPropsCallback";

type InsertListItemFn<FormValues extends UnknownObject> = <
  P extends keyof FormValues,
  ItemType extends FormValues[P] extends ReadonlyArray<infer V> ? V : never,
>(
  path: P,
  item: ItemType,
) => void;

export type FormSetters<FormValues extends UnknownObject> = {
  insertListItem: InsertListItemFn<FormValues>;
};

// Improved type safety for `path` argument in a Rule function
type RuleFn<Value, FullFormValues, FormPath extends Paths<FullFormValues>> = (
  value: Value,
  values: FullFormValues,
  path: FormPath,
) => React.ReactNode;

// Improved type safety for form rules to better handle nullable values and
// discriminated unions
type FormRule<Value, FullFormValues, FormPath extends Paths<FullFormValues>> =
  NonNullable<Value> extends ReadonlyArray<infer ListElementType> ?
    | ({
        [K in keyof NonNullable<ListElementType>]?:
          | RuleFn<NonNullable<ListElementType>[K], FullFormValues, FormPath>
          | (NonNullable<ListElementType>[K] extends (
              ReadonlyArray<infer NestedListItem>
            ) ?
              FormRulesRecord<NestedListItem, FullFormValues, FormPath>
            : NonNullable<ListElementType>[K] extends UnknownObject ?
              FormRulesRecord<
                NonNullable<ListElementType>[K],
                FullFormValues,
                FormPath
              >
            : never);
      } & {
        [formRootRule]?: RuleFn<Value, FullFormValues, FormPath>;
      })
    | RuleFn<Value, FullFormValues, FormPath>
  : NonNullable<Value> extends UnknownObject ?
    | FormRulesRecord<Value, FullFormValues, FormPath>
    | RuleFn<Value, FullFormValues, FormPath>
  : RuleFn<Value, FullFormValues, FormPath>;

// Improved type safety for a FormRules record in how it handles potentially
// nullable types
export type FormRulesRecord<
  FormValues,
  FullFormValues,
  FormPath extends Paths<FullFormValues> = Paths<FullFormValues>,
> = {
  [Key in keyof NonNullable<FormValues>]?: FormRule<
    NonNullable<FormValues>[Key],
    FullFormValues,
    FormPath
  >;
} & {
  [formRootRule]?: RuleFn<FormValues, FullFormValues, FormPath>;
};

/**
 * Mantine's `UseFormInput` type with improved type safety for the `validate`
 * option.
 */
type UseFormInput<
  FormValues extends UnknownObject,
  TransformValues extends (
    values: FormValues,
  ) => unknown = IdentityFnType<FormValues>,
  FormPath extends Paths<FormValues> = Paths<FormValues>,
> = Merge<
  MantineUseFormInput<FormValues, TransformValues>,
  {
    validate:
      | FormRulesRecord<FormValues, FormValues, FormPath>
      | ((values: FormValues) => FormErrors);
  }
>;

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
  ) => unknown = IdentityFnType<FormValues>,
  FormPath extends Paths<FormValues> = Paths<FormValues>,
>(
  formOptions: UseFormInput<FormValues, TransformValues, FormPath>,
): [FormType<FormValues, TransformValues, FormPath>, FormSetters<FormValues>] {
  const form = mantineUseForm<FormValues, TransformValues>(
    formOptions as MantineUseFormInput<FormValues, TransformValues>,
  );

  const insertListItem: InsertListItemFn<FormValues> = useCallback(
    (path, item) => {
      form.insertListItem(path, item);
    },
    [form],
  );

  const keysAndProps = useKeysAndPropsCallback(form);

  return [
    {
      ...form,
      keysAndProps,
    } as FormType<FormValues, TransformValues, FormPath>,
    {
      insertListItem,
    },
  ];
}

export type { FormType };
