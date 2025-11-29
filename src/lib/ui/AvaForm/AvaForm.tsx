import { Box, Button, Flex, Stack, Text } from "@mantine/core";
import { isEmail } from "@mantine/form";
import {
  ReactElement,
  ReactNode,
  Ref,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { match } from "ts-pattern";
import { FormRulesRecord, useForm, UseFormInput } from "@/lib/hooks/ui/useForm";
import { StringKeyOf } from "@/lib/types/utilityTypes";
import { constant } from "@/lib/utils/higherOrderFuncs";
import { objectKeys, objectValues } from "@/lib/utils/objects/misc";
import {
  AnyValidationFn,
  AvaFormRef,
  FormFieldSchema,
  GenericFormSchemaRecord,
  SemanticTextType,
  ValidBaseValueType,
  ValuesOfFieldRecord,
} from "./AvaForm.types";
import { UnknownFieldInput } from "./UnknownFieldInput";

function getDefaultSemanticValidationFn(
  semanticType: SemanticTextType,
): AnyValidationFn | undefined {
  return match(semanticType)
    .with("email", () => {
      return isEmail("Invalid email address");
    })
    .with("text", () => {
      // a general "text" type is always valid
      return constant(undefined);
    })
    .exhaustive(() => {
      return undefined;
    });
}

type Props<
  FieldSchemaRecord extends Record<
    string,
    FormFieldSchema<string, Record<string, ValidBaseValueType>>
  >,
  FieldKey extends StringKeyOf<FieldSchemaRecord>,
  FormValues extends ValuesOfFieldRecord<FieldSchemaRecord>,
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

  /** Whether to hide the submit button. */
  hideSubmitButton?: boolean;

  /** Content to show at the bottom of the form. */
  outroContent?: ReactNode;

  /** Whether to disable the submit button while the form is unchanged. */
  disableSubmitWhileUnchanged?: boolean;

  /** The alignment of the submit button. */
  buttonAlignment?: "right" | "left";

  /** The function to call when the form is submitted. */
  onSubmit?: (
    values: FormValues,
    event: React.FormEvent<HTMLFormElement> | undefined,
  ) => void;

  /** Whether the submit button is loading/spinning. */
  submitIsLoading?: boolean;

  /** Whether the submit button is disabled. */
  submitIsDisabled?: boolean;

  /** The ref to the AvaForm */
  ref?: Ref<AvaFormRef<FormValues>>;
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
  FieldKey extends StringKeyOf<FieldSchemaRecord>,
  FormValues extends ValuesOfFieldRecord<FieldSchemaRecord>,
>({
  ref,
  fields,
  formElements,
  onSubmit,
  introContent,
  outroContent,
  disableSubmitWhileUnchanged,
  buttonAlignment,
  submitIsLoading,
  submitIsDisabled,
  hideSubmitButton,
}: Props<FieldSchemaRecord, FieldKey, FormValues>): JSX.Element {
  const formNodeRef = useRef<HTMLFormElement>(null);
  const formInitializer = useMemo(() => {
    const initValues = {} as Record<FieldKey, ValidBaseValueType>;
    const validations = {} as FormRulesRecord<FormValues, FormValues>;
    const anyFieldRequiresSync = objectValues(fields).some((field) => {
      return field.type === "text" && field.syncWhileUntouched;
    });

    objectKeys(fields).forEach((objFieldKey) => {
      const fieldKey = objFieldKey as FieldKey;
      const field = fields[fieldKey]! as FormFieldSchema<FieldKey, FormValues>;

      // get the initial values
      initValues[fieldKey] = field.initialValue;

      // get the validation functions
      const semanticValidationFn =
        field.type === "text" && field.semanticType ?
          getDefaultSemanticValidationFn(field.semanticType)
        : undefined;

      if (field.validateFn || semanticValidationFn) {
        const fieldValidationFn = ((value, allFormValues, currentFieldKey) => {
          // before running validation, we first verify that the type of the
          // value is appropriate, before we call the custom validate function
          // (if one is provided)
          return match(field.type)
            .with("text", () => {
              // if a custom validate function is provided, we use it,
              // otherwise we'll use the semantic validation function (if
              // there is one)
              if (field.validateFn) {
                if (typeof value === "string") {
                  return field.validateFn(
                    value,
                    allFormValues,
                    currentFieldKey as FieldKey,
                  );
                }
                return "Received a non-string value for a text field";
              }
              return semanticValidationFn?.(value, allFormValues, fieldKey);
            })
            .with("select", () => {
              if (field.validateFn) {
                if (typeof value === "string") {
                  return field.validateFn(
                    value,
                    allFormValues,
                    currentFieldKey as FieldKey,
                  );
                }
                return "Received a non-string value for a select field";
              }
              // there is no semantic validation function to use
              return undefined;
            })
            .exhaustive(() => {
              return undefined;
            });
        }) as FormRulesRecord<FormValues, FormValues>[FieldKey];
        validations[fieldKey] = fieldValidationFn;
      }
    });

    return {
      mode: "uncontrolled" as const,
      initialValues: initValues,
      validate: validations,
      touchTrigger:
        anyFieldRequiresSync ? ("focus" as const) : ("change" as const),
    };
    // disable exhaustive-deps because we only want to generate these once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const form = useForm(formInitializer as UseFormInput<FormValues>);

  useImperativeHandle(ref, () => {
    return {
      getForm: () => {
        return form;
      },
      getFormNode: () => {
        return formNodeRef.current;
      },
      getFormValues: () => {
        return form.getValues();
      },
    };
  }, [form, formNodeRef]);

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
            const field = fields[fieldKey]! as FormFieldSchema<
              FieldKey,
              FormValues
            >;
            return (
              <UnknownFieldInput
                key={field.key}
                fieldKey={field.key}
                parentForm={form}
                fields={fields}
                field={field}
              />
            );
          }
          return <Text key={formElement}>{formElement}</Text>;
        }
        return formElement;
      });
    },
  };

  return (
    <form
      ref={formNodeRef}
      onSubmit={form.onSubmit((values, event) => {
        onSubmit?.(values, event);
      })}
    >
      <Stack gap="md">
        {elements.content(introContent)}
        {elements.innerFormElements()}
        {elements.content(outroContent)}
        {hideSubmitButton ? null : (
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
        )}
      </Stack>
    </form>
  );
}
