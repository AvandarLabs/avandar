import type {
  Config,
  Data,
  DefaultComponentProps,
  DefaultComponents,
  DefaultRootFieldProps,
} from "@puckeditor/core";
import type { Simplify } from "type-fest";

declare module "@puckeditor/core" {
  export function transformProps<
    InputComponents extends DefaultComponents = DefaultComponents,
    InputRootProps extends DefaultComponentProps = DefaultRootFieldProps,
    OutputComponents extends {
      [ComponentName in keyof InputComponents]: {
        [key: string]: unknown;
      };
    } = InputComponents,
    OutputRootProps extends {
      [key: string]: unknown;
    } = InputRootProps,
  >(
    data: Partial<Data>,
    propTransforms: Partial<{
      [ComponentName in keyof InputComponents]: (
        props: Simplify<InputComponents[ComponentName]>,
      ) => Simplify<OutputComponents[ComponentName]>;
    }> & {
      root: (props: Simplify<InputRootProps>) => Simplify<OutputRootProps>;
    },
    config?: Config,
  ): Data<OutputComponents, OutputRootProps>;
}
