import { Trans, useLingui } from "@lingui/react/macro";
import {
  ActionIcon,
  Button,
  Checkbox,
  Fieldset,
  Group,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import {
  EntityConfigFormValues,
  makeDefaultManualEntryField,
} from "@/views/EntityDesignerApp/EntityConfigCreatorView/entityConfigFormTypes";
import type { FormType } from "@avandar/ui/hooks";
import type { EntityConfigId } from "$/models/EntityConfig/EntityConfig.types";

type Props = {
  entityConfigForm: FormType<EntityConfigFormValues>;
  entityConfigId: EntityConfigId;
};

export function ManualEntryFieldsBlock({
  entityConfigForm,
  entityConfigId,
}: Props): JSX.Element {
  const { t } = useLingui();
  const { manualEntryFields } = entityConfigForm.getValues();

  const fieldRows = manualEntryFields.map((field, idx) => {
    const [fieldKeys, fieldInputProps] = entityConfigForm.keysAndProps(
      `manualEntryFields.${idx}`,
      ["name", "allowManualEdit", "isArray"],
    );

    return (
      <Stack key={field.id}>
        <Group>
          <TextInput
            key={fieldKeys.name}
            required
            label={t`Field Name`}
            placeholder={t`Enter a name for the field`}
            flex={1}
            {...fieldInputProps.name()}
            onChange={(e) => {
              // use the `replaceListItem` function so that the
              // `manualEntryFields` array gets reconstructed, so that we can
              // rebuild the Select options for the Title and ID field selects
              entityConfigForm.replaceListItem(`manualEntryFields`, idx, {
                ...field,
                name: e.currentTarget.value,
              });
            }}
          />
          <ActionIcon
            color="red"
            onClick={() => {
              return entityConfigForm.removeListItem("manualEntryFields", idx);
            }}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
        <Group>
          <Checkbox
            key={fieldKeys.allowManualEdit}
            label={t`Allow manual edit`}
            {...fieldInputProps.allowManualEdit({ type: "checkbox" })}
          />
          <Checkbox
            key={fieldKeys.isArray}
            label={t`Allow multiple values`}
            {...fieldInputProps.isArray({ type: "checkbox" })}
          />
        </Group>
      </Stack>
    );
  });

  return (
    <Fieldset legend={t`Fields to be manually entered`}>
      <Stack>
        {entityConfigForm.errors.fields ?
          <Text c="danger">{entityConfigForm.errors.fields}</Text>
        : <>
            {fieldRows.length === 0 ?
              <Text c="gray">
                <Trans>No fields have been added</Trans>
              </Text>
            : fieldRows}
          </>
        }

        <Button
          onClick={() => {
            entityConfigForm.insertListItem(
              "manualEntryFields",
              makeDefaultManualEntryField({
                entityConfigId,
                name: t`New field`,
              }),
            );
            entityConfigForm.clearFieldError("fields");
          }}
        >
          <Trans>Add Field</Trans>
        </Button>
      </Stack>
    </Fieldset>
  );
}
