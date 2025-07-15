import { Box, Button, Stack, Text, TextInput } from "@mantine/core";
import { FormValidateInput, isEmail, useForm } from "@mantine/form";
import { HTMLInputAutoCompleteAttribute, ReactNode, useMemo } from "react";
import { match } from "ts-pattern";
import { StringKeyOf } from "type-fest";
import { constant } from "@/lib/utils/higherOrderFuncs";
import { propIsDefined } from "@/lib/utils/objects/higherOrderFuncs";
import { objectKeys, objectValues } from "@/lib/utils/objects/misc";
import { camelToTitleCase } from "@/lib/utils/strings/transformations";

type SemanticTextType = "email" | "text";

type ValidationFn = (
  value: string,
  fullFormValues: Record<string, string>,
) => ReactNode;

type FormFieldSchema = {
  type: "text";
  initialValue: string;
  description?: string;
  semanticType?: SemanticTextType;
  required?: boolean;
  name?: string;
  label?: string;
  autoComplete?: HTMLInputAutoCompleteAttribute;
  disabled?: boolean;
  syncWhileUntouched?: {
    syncFrom: string;
    transform?: (value: string) => string;
  };
  validateFn?: ValidationFn;
};

type FieldsToValuesObject<Fields extends Record<string, FormFieldSchema>> = {
  [fieldKey in StringKeyOf<Fields>]: Fields[fieldKey]["initialValue"];
};

function getDefaultFieldSchema(
  fieldKey: string,
  providedSchema: FormFieldSchema,
): FormFieldSchema {
  const processedSchema = {
    ...providedSchema,
    label:
      providedSchema.label ??
      camelToTitleCase(fieldKey, { capitalizeFirstLetter: true }),
  };

  return match(providedSchema)
    .with({ semanticType: "email" }, () => {
      return {
        name: "email",
        autoComplete: "email",
        ...processedSchema,
      };
    })
    .with({ semanticType: "text" }, () => {
      return processedSchema;
    })
    .exhaustive(() => {
      return processedSchema;
    });
}

function getDefaultSemanticValidationFn(
  semanticType: SemanticTextType,
): ValidationFn | undefined {
  switch (semanticType) {
    case "email":
      return isEmail("Invalid email address");
    case "text":
      return undefined;
  }
}

type Props<
  Fields extends Record<string, FormFieldSchema>,
  FormValues extends FieldsToValuesObject<Fields>,
> = {
  introText?: ReactNode;
  fields: Fields;
  formElements: ReadonlyArray<StringKeyOf<Fields> | ReactNode>;
  outroText?: ReactNode;
  onSubmit: (values: FormValues) => void;
  submitIsLoading?: boolean;
};

export function BasicForm<
  Fields extends Record<string, FormFieldSchema>,
  FormValues extends FieldsToValuesObject<Fields>,
>({
  fields,
  formElements: formElements,
  onSubmit,
  introText,
  outroText,
  submitIsLoading,
}: Props<Fields, FormValues>): JSX.Element {
  const formInitializer = useMemo(() => {
    const initValues = {} as Record<string, string>;
    const validations = {} as Record<string, ValidationFn>;
    const anyFieldRequiresSync = objectValues(fields).some(
      propIsDefined("syncWhileUntouched"),
    );

    objectKeys(fields).forEach((fieldKey) => {
      const field = fields[fieldKey]!;

      // get the initial values
      initValues[fieldKey] = field.initialValue;

      // get the validation functions
      const semanticValidationFn =
        field.semanticType ?
          getDefaultSemanticValidationFn(field.semanticType)
        : undefined;

      if (field.validateFn || semanticValidationFn) {
        validations[fieldKey] =
          field.validateFn ?? semanticValidationFn ?? constant(undefined);
      }
    });

    return {
      mode: "uncontrolled",
      initialValues: initValues as FormValues,
      validate: validations as FormValidateInput<FormValues>,
      onValuesChange: (values: FormValues, previousValues: FormValues) => {
        // sync values from other fields
        objectKeys(fields).forEach((fieldKey) => {
          const field = fields[fieldKey]!;

          // only proceed if this field requires syncing to another field
          if (!field.syncWhileUntouched) {
            return;
          }

          const { syncFrom: sourceKey, transform } = field.syncWhileUntouched;
          const newSourceValue = values[sourceKey as keyof FormValues];
          const prevSourceValue = previousValues[sourceKey as keyof FormValues];

          if (!form.isTouched(fieldKey) && newSourceValue !== prevSourceValue) {
            form.setFieldValue(
              fieldKey,

              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore This is safe
              transform ? transform(newSourceValue) : newSourceValue,
            );
          }
        });
      },
      touchTrigger: anyFieldRequiresSync ? "focus" : "change",
    } as const;
    // disable exhaustive-deps because we only want to generate these once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const form = useForm<FormValues>(formInitializer);

  const innerFormElements = formElements.map((formElement) => {
    if (typeof formElement === "string") {
      if (formElement in fields) {
        const fieldKey = formElement;
        const field = fields[fieldKey]!;
        const { syncWhileUntouched, ...moreInputProps } = getDefaultFieldSchema(
          fieldKey,
          field,
        );
        const { initialValue, ...restOfInputProps } = moreInputProps;
        return (
          <TextInput
            key={form.key(fieldKey)}
            {...form.getInputProps(fieldKey)}
            {...restOfInputProps}
          />
        );
      }

      return <Text>{formElement}</Text>;
    }

    return formElement;
  });

  function renderText(text: ReactNode) {
    if (typeof text === "string") {
      return <Text>{text}</Text>;
    }
    return text;
  }

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Stack gap="md">
        {renderText(introText)}
        {innerFormElements}
        {renderText(outroText)}
        <Box mt="sm">
          <Button
            loading={submitIsLoading}
            disabled={submitIsLoading}
            type="submit"
          >
            Submit
          </Button>
        </Box>
      </Stack>
    </form>
  );
}
