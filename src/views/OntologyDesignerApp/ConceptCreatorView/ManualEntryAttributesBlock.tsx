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
  ConceptFormValues,
  makeDefaultManualEntryAttribute,
} from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import type { FormType } from "@avandar/ui/hooks";
import type { ConceptId } from "$/models/ontology/Concept/Concept.types";

type Props = {
  conceptForm: FormType<ConceptFormValues>;
  conceptId: ConceptId;
};

export function ManualEntryAttributesBlock({
  conceptForm,
  conceptId,
}: Props): JSX.Element {
  const { t } = useLingui();
  const { manualEntryAttributes } = conceptForm.getValues();

  const attributeRows = manualEntryAttributes.map((attribute, idx) => {
    const [attributeKeys, attributeInputProps] = conceptForm.keysAndProps(
      `manualEntryAttributes.${idx}`,
      ["name", "allowManualEdit", "isArray"],
    );

    return (
      <Stack key={attribute.id}>
        <Group>
          <TextInput
            key={attributeKeys.name}
            required
            label={t`Field name`}
            placeholder={t`Enter a name for the field`}
            flex={1}
            {...attributeInputProps.name()}
            onChange={(e) => {
              // use the `replaceListItem` function so that the
              // `manualEntryAttributes` array gets reconstructed, so that
              // we can rebuild the Select options for the label and
              // identifier attribute selects
              conceptForm.replaceListItem(`manualEntryAttributes`, idx, {
                ...attribute,
                name: e.currentTarget.value,
              });
            }}
          />
          <ActionIcon
            color="red"
            onClick={() => {
              return conceptForm.removeListItem("manualEntryAttributes", idx);
            }}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
        <Group>
          <Checkbox
            key={attributeKeys.allowManualEdit}
            label={t`Allow manual edit`}
            {...attributeInputProps.allowManualEdit({ type: "checkbox" })}
          />
          <Checkbox
            key={attributeKeys.isArray}
            label={t`Allow multiple values`}
            {...attributeInputProps.isArray({ type: "checkbox" })}
          />
        </Group>
      </Stack>
    );
  });

  return (
    <Fieldset legend={t`Fields to be manually entered`}>
      <Stack>
        {conceptForm.errors.attributes ?
          <Text c="danger">{conceptForm.errors.attributes}</Text>
        : <>
            {attributeRows.length === 0 ?
              <Text c="gray">
                <Trans>No fields have been added</Trans>
              </Text>
            : attributeRows}
          </>
        }

        <Button
          onClick={() => {
            conceptForm.insertListItem(
              "manualEntryAttributes",
              makeDefaultManualEntryAttribute({
                conceptId,
                name: t`New field`,
              }),
            );
            conceptForm.clearFieldError("attributes");
          }}
        >
          <Trans>Add field</Trans>
        </Button>
      </Stack>
    </Fieldset>
  );
}
