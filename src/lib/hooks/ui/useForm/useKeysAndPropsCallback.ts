import { UseFormReturnType as MantineUseFormReturnType } from "@mantine/form";
import { useCallback } from "react";
import { Paths } from "type-fest";
import { UnknownObject } from "@/lib/types/common";
import { IdentityFnType } from "@/lib/types/utilityTypes";

type GetPathTail<Path, PathHead extends string> =
  Path extends `${PathHead}.${infer Tail}` ? Tail : never;

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

/**
 * This has the same return type as `form.getInputProps`.
 *
 * This function doesn't include the `path` argument because it
 * is being used in the `GetKeyAndPropsFn` where the path will
 * already be bound to this function call.
 *
 * @see https://mantine.dev/form/get-input-props
 */
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

export type GetKeyAndPropsFn<
  FormValues extends UnknownObject,
  FormPath extends Paths<FormValues> = Paths<FormValues>,
> = <
  BasePathOrFullPaths extends string | readonly FormPath[],
  PathTail extends BasePathOrFullPaths extends string ?
    GetPathTail<FormPath, BasePathOrFullPaths>
  : never = never,
>(
  basePathOrFullPaths: BasePathOrFullPaths,
  pathTails?: readonly PathTail[],
) => [
  keys: BasePathOrFullPaths extends string ? Record<PathTail, string>
  : Record<BasePathOrFullPaths[number], string>,
  inputProps: BasePathOrFullPaths extends string ?
    Record<PathTail, GetInputPropsFn>
  : Record<BasePathOrFullPaths[number], GetInputPropsFn>,
];

export function useKeysAndPropsCallback<
  FormValues extends UnknownObject,
  TransformValues extends (
    values: FormValues,
  ) => unknown = IdentityFnType<FormValues>,
  FormPath extends Paths<FormValues> = Paths<FormValues>,
>(
  form: MantineUseFormReturnType<FormValues, TransformValues>,
): GetKeyAndPropsFn<FormValues, FormPath> {
  return useCallback(
    <
      FullPath extends FormPath,
      BasePath extends string,
      PathTail extends GetPathTail<FormPath, BasePath>,
    >(
      basePathOrFullPaths: BasePath | readonly FullPath[],
      pathTails?: readonly PathTail[],
    ) => {
      // if an array of full paths was provided, use that
      if (Array.isArray(basePathOrFullPaths)) {
        const keys = {} as Record<FullPath, string>;
        const inputProps = {} as Record<FullPath, GetInputPropsFn>;
        const fullPaths = basePathOrFullPaths as readonly FullPath[];

        // generate all keys and inputProps functions
        fullPaths.forEach((path) => {
          keys[path] = form.key(path);
          inputProps[path] = (options?: GetInputPropsOptions) => {
            return form.getInputProps(path, options);
          };
        });

        return [keys, inputProps];
      }

      // this block is the case where a basePath was provided with an array of
      // path tails
      const keys = {} as Record<PathTail, string>;
      const inputProps = {} as Record<PathTail, GetInputPropsFn>;
      const basePath = basePathOrFullPaths as BasePath;

      // generate all keys and inputProps functions
      (pathTails ?? []).forEach((pathTail) => {
        const path = `${basePath}.${pathTail}`;
        keys[pathTail] = form.key(path);
        inputProps[pathTail] = (options?: GetInputPropsOptions) => {
          return form.getInputProps(path, options);
        };
      });

      return [keys, inputProps];
    },
    [form],
  ) as GetKeyAndPropsFn<FormValues, FormPath>;
}
