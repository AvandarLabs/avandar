import { Box, Button, Flex, Stack, Text, TextInput } from "@mantine/core";
import { FormValidateInput, isEmail, useForm } from "@mantine/form";
import { ReactNode, useMemo } from "react";
import { match } from "ts-pattern";
import { Simplify } from "type-fest";
import { StringKeyOf } from "@/lib/types/utilityTypes";
import { constant } from "@/lib/utils/higherOrderFuncs";
import { propIsDefined } from "@/lib/utils/objects/higherOrderFuncs";
import { objectKeys, objectValues } from "@/lib/utils/objects/misc";
import { camelToTitleCase } from "@/lib/utils/strings/transformations";
import {
  FormFieldSchema,
  GenericFormSchemaRecord,
  SemanticTextType,
  ValidationFn,
} from "./BasicForm.types";

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

  if (processedSchema.semanticType) {
    return match(processedSchema.semanticType)
      .with("email", () => {
        return {
          name: "email",
          autoComplete: "email",
          ...processedSchema,
        };
      })
      .with("text", () => {
        return processedSchema;
      })
      .exhaustive(() => {
        return processedSchema;
      });
  }

  return processedSchema;
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

/**
 * Convert a record of field schemas to a record mapping the field keys to their
 * value types.
 */
type FieldsToValuesObject<
  FieldSchemaRecord extends Record<string, FormFieldSchema>,
> = Simplify<{
  [fieldKey in StringKeyOf<FieldSchemaRecord>]: FieldSchemaRecord[fieldKey]["initialValue"];
}>;

type Props<
  FieldSchemaRecord extends Record<string, FormFieldSchema>,
  FormValues extends FieldsToValuesObject<FieldSchemaRecord>,
> = {
  /** Content to show at the top of the form. */
  introContent?: ReactNode;

  /** A record of field schemas. */
  fields: FieldSchemaRecord;

  /**
   * An array of the form elements to render.
   * A form element can either be a field key (in which case we'd render the
   * form input according to the field schema, specified in `fields`), or it
   * can be an arbitrary React node (in which case we'd render it as is).
   *
   * The ability to specify arbitrary React nodes allows for more flexibility
   * in the form's layout, by letting us inject dividers, titles, etc.
   */
  formElements: ReadonlyArray<StringKeyOf<FieldSchemaRecord> | ReactNode>;

  /** Content to show at the bottom of the form. */
  outroContent?: ReactNode;

  /** Whether to disable the submit button while the form is unchanged. */
  disableSubmitWhileUnchanged?: boolean;

  /** The alignment of the submit button. */
  buttonAlignment?: "right" | "left";

  /** The function to call when the form is submitted. */
  onSubmit: (values: FormValues) => void;

  /** Whether the submit button is loading/spinning. */
  submitIsLoading?: boolean;
};

/**
 * A basic form component that renders a form with a submit button.
 *
 * This is a wrapper around the `useForm` hook and provides a far more
 * convenient way of specifying form fields by abstracting a lot of the logic
 * and handlers.
 */
export function BasicForm<
  FieldSchemaRecord extends GenericFormSchemaRecord,
  FormValues extends FieldsToValuesObject<FieldSchemaRecord>,
>({
  fields,
  formElements,
  onSubmit,
  introContent,
  outroContent,
  disableSubmitWhileUnchanged,
  buttonAlignment,
  submitIsLoading,
}: Props<FieldSchemaRecord, FormValues>): JSX.Element {
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
        {renderText(introContent)}
        {innerFormElements}
        {renderText(outroContent)}
        <Box mt="sm">
          <Flex
            justify={buttonAlignment === "left" ? "flex-start" : "flex-end"}
          >
            <Button
              loading={submitIsLoading}
              disabled={
                submitIsLoading ||
                (disableSubmitWhileUnchanged && !form.isDirty())
              }
              type="submit"
            >
              Submit
            </Button>
          </Flex>
        </Box>
      </Stack>
    </form>
  );
}
