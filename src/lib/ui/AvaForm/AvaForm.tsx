import { Box, Button, Flex, Stack, Text } from "@mantine/core";
import { isEmail } from "@mantine/form";
import { ReactElement, ReactNode, useMemo } from "react";
import { match } from "ts-pattern";
import { FormType, useForm } from "@/lib/hooks/ui/useForm";
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
  ValuesOfFieldRecord,
} from "./AvaForm.types";
import { AvaTextInput } from "./AvaTextInput";
import type { UseFormInput } from "@/lib/hooks/ui/useForm";

function getDefaultFieldSchema<
  FormValues extends ValuesOfFieldRecord<GenericFormSchemaRecord>,
  FieldKey extends StringKeyOf<FormValues>,
>(
  fieldKey: FieldKey,
  providedSchema: FormFieldSchema<FormValues, FieldKey>,
): FormFieldSchema<FormValues, FieldKey> {
  const processedSchema = {
    ...providedSchema,
    label:
      providedSchema.label ??
      camelToTitleCase(String(fieldKey), { capitalizeFirstLetter: true }),
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
  return match(semanticType)
    .with("email", () => {
      return isEmail("Invalid email address");
    })
    .with("text", () => {
      return constant(undefined);
    })
    .exhaustive();
}

type Props<
  FieldSchemaRecord extends GenericFormSchemaRecord,
  FieldKey extends StringKeyOf<FieldSchemaRecord>,
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
  formElements: ReadonlyArray<FieldKey | ReactElement | null | undefined>;

  /** Content to show at the bottom of the form. */
  outroContent?: ReactNode;

  /** Whether to disable the submit button while the form is unchanged. */
  disableSubmitWhileUnchanged?: boolean;

  /** The alignment of the submit button. */
  buttonAlignment?: "right" | "left";

  /** The function to call when the form is submitted. */
  onSubmit: (
    values: ValuesOfFieldRecord<FieldSchemaRecord>,
    event: React.FormEvent<HTMLFormElement> | undefined,
  ) => void;

  /** Whether the submit button is loading/spinning. */
  submitIsLoading?: boolean;

  /** Whether the submit button is disabled. */
  submitIsDisabled?: boolean;
};

/**
 * A basic form component that renders a form with a submit button.
 *
 * This is a wrapper around the `useForm` hook and provides a far more
 * convenient way of specifying form fields by abstracting a lot of the logic
 * and handlers.
 */
export function AvaForm<
  FieldSchemaRecord extends GenericFormSchemaRecord,
  FormValues extends ValuesOfFieldRecord<FieldSchemaRecord>,
  FieldKey extends StringKeyOf<FieldSchemaRecord> & StringKeyOf<FormValues>,
>({
  fields,
  formElements,
  onSubmit,
  introContent,
  outroContent,
  disableSubmitWhileUnchanged,
  buttonAlignment,
  submitIsLoading,
  submitIsDisabled,
}: Props<FieldSchemaRecord, FieldKey>): JSX.Element {
  const formInitializer = useMemo(() => {
    const initValues = {} as Record<FieldKey, string>;
    const validations = {} as Record<
      FieldKey,
      ValidationFn<unknown, FormValues, FieldKey>
    >;
    const anyFieldRequiresSync = objectValues(fields).some(
      propIsDefined("syncWhileUntouched"),
    );

    objectKeys(fields).forEach((objFieldKey) => {
      const fieldKey = objFieldKey as FieldKey;
      const field = fields[fieldKey]!;

      // get the initial values
      initValues[fieldKey] = field.initialValue;

      // get the validation functions
      const semanticValidationFn =
        field.semanticType ?
          getDefaultSemanticValidationFn(field.semanticType)
        : undefined;

      if (field.validateFn || semanticValidationFn) {
        validations[fieldKey] = (
          value: unknown,
          allFormValues: FormValues,
          currentFieldKey: FieldKey,
        ) => {
          // before running validation, we first verify that the type of the
          // value is appropriate, before we call the custom validate function
          // (if one is provided)
          return match(field.type)
            .with("text", () => {
              if (field.validateFn) {
                if (typeof value === "string") {
                  return field.validateFn(
                    value,
                    allFormValues,
                    currentFieldKey,
                  );
                }
                return "Received a non-string value for a text field";
              }
              return semanticValidationFn?.(value, allFormValues, fieldKey);
            })
            .exhaustive();
        };
      }
    });

    return {
      mode: "uncontrolled" as const,
      initialValues: initValues as FormValues,
      validate: validations as UseFormInput<FormValues>["validate"],
      touchTrigger:
        anyFieldRequiresSync ? ("focus" as const) : ("change" as const),
    };
    // disable exhaustive-deps because we only want to generate these once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const form: FormType<FormValues> = useForm(formInitializer);

  const elements = {
    content: (elt: ReactNode) => {
      if (typeof elt === "string") {
        return <Text>{elt}</Text>;
      }
      return elt;
    },

    innerFormElements: () => {
      return formElements.map((formElement) => {
        if (typeof formElement === "string") {
          if (formElement in fields) {
            const fieldKey = formElement as FieldKey;
            const field = fields[fieldKey]!;
            const { syncWhileUntouched, ...moreInputProps } =
              getDefaultFieldSchema(fieldKey, field);
            const { initialValue, debounceMs, onChange, ...restOfInputProps } =
              moreInputProps;
            return (
              <AvaTextInput
                key={fieldKey}
                fieldKey={fieldKey}
                parentForm={form}
                fields={fields}
                debounceMs={debounceMs}
                onChange={onChange}
                {...restOfInputProps}
              />
            );
          }
          return <Text>{formElement}</Text>;
        }
        return formElement;
      });
    },
  };

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Stack gap="md">
        {elements.content(introContent)}
        {elements.innerFormElements()}
        {elements.content(outroContent)}
        <Box mt="sm">
          <Flex
            justify={buttonAlignment === "left" ? "flex-start" : "flex-end"}
          >
            <Button
              loading={submitIsLoading}
              disabled={
                submitIsLoading ||
                (disableSubmitWhileUnchanged && !form.isDirty()) ||
                submitIsDisabled
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
