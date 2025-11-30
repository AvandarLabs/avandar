import {
  FormErrors,
  formRootRule,
  useForm as mantineUseForm,
  UseFormInput as MantineUseFormInput,
} from "@mantine/form";
import { UnknownObject } from "$/lib/types/common";
import { Merge, Paths } from "type-fest";
import { FormType } from "./types";
import { useKeysAndPropsCallback } from "./useKeysAndPropsCallback";

// Improved type safety for `path` argument in a Rule function
export type RuleFn<
  Value,
  FullFormValues,
  FormPath extends Paths<FullFormValues>,
> = (value: Value, values: FullFormValues, path: FormPath) => React.ReactNode;

// Improved type safety for form rules to better handle nullable values and
// discriminated unions
export type FormRule<
  Value,
  FullFormValues,
  FormPath extends Paths<FullFormValues>,
> =
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
export type UseFormInput<
  FormValues extends UnknownObject,
  TransformValues = FormValues,
  FormPath extends Paths<FormValues> = Paths<FormValues>,
> = Merge<
  MantineUseFormInput<FormValues, (values: FormValues) => TransformValues>,
  {
    validate?:
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
  TransformValues = FormValues,
  FormPath extends Paths<FormValues> = Paths<FormValues>,
>(
  formOptions: UseFormInput<FormValues, TransformValues, FormPath>,
): FormType<FormValues, TransformValues, FormPath> {
  const form = mantineUseForm<
    FormValues,
    (values: FormValues) => TransformValues
  >(
    formOptions as MantineUseFormInput<
      FormValues,
      (values: FormValues) => TransformValues
    >,
  );

  const keysAndProps = useKeysAndPropsCallback(form);

  return {
    ...form,
    keysAndProps,
    useFieldWatch: form.watch,
  } as FormType<FormValues, TransformValues, FormPath>;
}

export type { FormType };
