import {
  useForm as mantineUseForm,
  UseFormReturnType as MantineUseFormReturnType,
  UseFormInput,
} from "@mantine/form";
import { useCallback } from "react";
import { Merge, Paths, UnknownArray } from "type-fest";
import { UnknownObject } from "@/lib/types/common";
import { IdentityTypeFn } from "@/lib/types/utilityTypes";

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

type InsertListItemFn<FormValues extends UnknownObject> = <
  P extends keyof FormValues,
  ItemType extends FormValues[P] extends ReadonlyArray<infer V> ? V : never,
>(
  path: P,
  item: ItemType,
) => void;

/**
 * These are the same options from `form.getInputProps`.
 * @see https://mantine.dev/form/get-input-props
 */
type GetInputPropsOptions = {
  type?: "input" | "checkbox";
  withError?: boolean;
  withFocus?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

type GetPathTail<Path, PathHead extends string> =
  Path extends `${PathHead}.${infer Tail}` ? Tail : never;

type GetInputPropsFn = (options?: GetInputPropsOptions) => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  onChange: any;
  value?: any;
  defaultValue?: any;
  checked?: any;
  defaultChecked?: any;
  error?: any;
  onFocus?: any;
  onBlur?: any;
  /* eslint-enable @typescript-eslint/no-explicit-any */
};

type GetKeyAndPropsFn<
  FormValues extends UnknownObject,
  FormPath extends Paths<FormValues> = Paths<FormValues>,
> = <BasePath extends string, PathTail extends GetPathTail<FormPath, BasePath>>(
  basePath: BasePath,
  keys: readonly PathTail[],
) => [
  keys: Record<PathTail, string>,
  inputProps: Record<PathTail, GetInputPropsFn>,
];

/**
 * An improved version of Mantine's `UseFormReturnType` with
 * significantly better type safety.
 */
export type FormType<
  FormValues extends UnknownObject,
  TransformedValues extends (
    values: FormValues,
  ) => unknown = IdentityTypeFn<FormValues>,
  FormPath extends Paths<FormValues> = Paths<FormValues>,
> = Merge<
  MantineUseFormReturnType<FormValues, TransformedValues>,
  {
    key: (path: FormPath) => string;
    watch: <P extends FormPath>(
      path: P,
      subscriberFn: (payload: {
        previousValue: PathValue<FormValues, P>;
        value: PathValue<FormValues, P>;
        touched: boolean;
        dirty: boolean;
      }) => void,
    ) => void;
    keysAndProps: GetKeyAndPropsFn<FormValues, FormPath>;
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
  FormPath extends Paths<FormValues> = Paths<FormValues>,
>(
  formOptions: UseFormInput<FormValues, TransformValues>,
): [FormType<FormValues, TransformValues, FormPath>, FormSetters<FormValues>] {
  const form = mantineUseForm<FormValues, TransformValues>(formOptions);
  const insertListItem: InsertListItemFn<FormValues> = useCallback(
    (path, item) => {
      form.insertListItem(path, item);
    },
    [form],
  );

  const keysAndProps = useCallback(
    <P extends string, PathTail extends GetPathTail<FormPath, P>>(
      basePath: P,
      pathTails: readonly PathTail[],
    ) => {
      const keys = {} as Record<PathTail, string>;
      const inputProps = {} as Record<PathTail, GetInputPropsFn>;

      pathTails.forEach((pathTail) => {
        const path = `${basePath}.${pathTail}`;
        keys[pathTail] = form.key(path);
        inputProps[pathTail] = (options?: GetInputPropsOptions) => {
          return form.getInputProps(path, options);
        };
      });

      return [keys, inputProps];
    },
    [form],
  );

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
