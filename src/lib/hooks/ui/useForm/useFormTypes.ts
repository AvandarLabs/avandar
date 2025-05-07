import { UseFormReturnType as MantineUseFormReturnType } from "@mantine/form";
import { Merge, Paths } from "type-fest";
import { UnknownObject } from "@/lib/types/common";
import { IdentityFnType } from "@/lib/types/utilityTypes";
import { PathValue } from "@/lib/utils/objects/getValueAt";
import { GetKeyAndPropsFn } from "./useKeysAndPropsCallback";

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
