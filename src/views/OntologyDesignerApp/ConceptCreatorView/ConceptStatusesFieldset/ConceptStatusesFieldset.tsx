import { Trans, useLingui } from "@lingui/react/macro";
import { Fieldset, Stack, Text } from "@mantine/core";
import { StatusSetEditor } from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor";
import { getStatusSetValueFromFormValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/getStatusSetValueFromFormValues/getStatusSetValueFromFormValues";
import type { ConceptFormValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import type { FormType } from "@avandar/ui/hooks";
import type { ReactNode } from "react";

type Props = {
  conceptForm: FormType<ConceptFormValues>;
};

/**
 * The create form's statuses: the stages a new case type's records move
 * through, and the one they start in. Every edit goes straight back into
 * the form, which sends the set when the case type is created.
 */
export function ConceptStatusesFieldset({
  conceptForm,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const { statuses, defaultStatusId } = conceptForm.getValues();
  const statusesError = conceptForm.errors.statuses;

  return (
    <Fieldset variant="unstyled" legend={t`Statuses`}>
      <Stack gap="xs">
        <Text size="sm" c="dimmed">
          <Trans>
            The stages a record moves through. New records start in the
            default status.
          </Trans>
        </Text>
        <StatusSetEditor
          value={getStatusSetValueFromFormValues({ statuses, defaultStatusId })}
          onChange={(nextValue) => {
            conceptForm.setFieldValue("statuses", nextValue.statuses);
            // The form's default cannot be empty. An emptied set keeps the
            // last one, and `getStatusSetValueFromFormValues` drops it.
            if (nextValue.defaultStatusId !== undefined) {
              conceptForm.setFieldValue(
                "defaultStatusId",
                nextValue.defaultStatusId,
              );
            }
            conceptForm.clearFieldError("statuses");
          }}
        />
        {statusesError ? (
          <Text size="sm" c="danger">
            {statusesError}
          </Text>
        ) : null}
      </Stack>
    </Fieldset>
  );
}
