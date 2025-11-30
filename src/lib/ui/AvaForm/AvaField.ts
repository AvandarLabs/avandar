import { config } from "zod";
import { SelectData } from "../inputs/Select";
import {
  AnyFormValues,
  SelectFieldSchema,
  TextFieldSchema,
} from "./AvaForm.types";

export const AvaField = {
  text: <
    FieldKey extends string,
    FormValues extends AnyFormValues & Record<FieldKey, string>,
  >(
    options: Omit<TextFieldSchema<FieldKey, FormValues>, "type">,
  ): TextFieldSchema<FieldKey, FormValues> => {
    return {
      type: "text",
      ...options,
    };
  },

  email: <
    FieldKey extends string,
    FormValues extends AnyFormValues & Record<FieldKey, string>,
  >(
    options: Omit<TextFieldSchema<FieldKey, FormValues>, "type">,
  ): TextFieldSchema<FieldKey, FormValues> => {
    return {
      type: "text",
      semanticType: "email",
      // TODO(jpsyx): fill in the isEmail validation function here
      ...options,
    };
  },

  select: <FieldKey extends string, Data extends SelectData<string>>(
    options: Omit<SelectFieldSchema<FieldKey, Data>, "type">,
  ): SelectFieldSchema<FieldKey, Data> => {
    return {
      type: "select",
      ...config,
      ...options,
    };
  },
};
