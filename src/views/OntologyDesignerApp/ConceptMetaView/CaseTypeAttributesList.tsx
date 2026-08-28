import { Trans } from "@lingui/react/macro";
import { Badge, Group, Stack, Text } from "@mantine/core";
import css from "@/views/OntologyDesignerApp/ConceptMetaView/CaseTypeAttributesList.module.css";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ReactNode } from "react";

type Attribute = NonNullable<Concept.T<"Full">["attributes"]>[number];

type Props = {
  attributes: readonly Attribute[] | undefined;
  datasets?: readonly Dataset.T[];
};

/**
 * Readable attribute rows for a case type, instead of a raw object dump.
 */
export function CaseTypeAttributesList({
  attributes,
  datasets,
}: Props): ReactNode {
  if (!attributes || attributes.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        <Trans>No attributes yet</Trans>
      </Text>
    );
  }

  return (
    <Stack gap={0} className={css.list} role="list">
      {attributes.map((attribute) => {
        return (
          <AttributeRow
            key={attribute.id}
            attribute={attribute}
            datasets={datasets}
          />
        );
      })}
    </Stack>
  );
}

function AttributeRow({
  attribute,
  datasets,
}: {
  attribute: Attribute;
  datasets: readonly Dataset.T[] | undefined;
}): ReactNode {
  const sourceName = datasetNameForAttribute(attribute, datasets);

  return (
    <Group
      role="listitem"
      className={css.row}
      justify="space-between"
      wrap="nowrap"
      gap="md"
      align="flex-start"
    >
      <Stack gap={2} miw={0}>
        <Text fw={500} truncate>
          {attribute.name}
        </Text>
        {attribute.description ? (
          <Text size="sm" c="dimmed" lineClamp={2}>
            {attribute.description}
          </Text>
        ) : null}
      </Stack>
      <AttributeChips attribute={attribute} sourceName={sourceName} />
    </Group>
  );
}

function AttributeChips({
  attribute,
  sourceName,
}: {
  attribute: Attribute;
  sourceName: string | undefined;
}): ReactNode {
  return (
    <Group gap="xs" wrap="nowrap">
      {attribute.isIdentifier ? (
        <Badge variant="light" color="neutral" size="sm">
          <Trans>ID</Trans>
        </Badge>
      ) : null}
      {attribute.isLabel ? (
        <Badge variant="light" color="primary" size="sm">
          <Trans>Name</Trans>
        </Badge>
      ) : null}
      {sourceName ? (
        <Text className={css.source} lineClamp={1}>
          {sourceName}
        </Text>
      ) : attribute.mappingType === "dataset_column" ? (
        <Badge variant="light" color="neutral" size="sm">
          <Trans>Dataset</Trans>
        </Badge>
      ) : (
        <Badge variant="light" color="neutral" size="sm">
          <Trans>Entered manually</Trans>
        </Badge>
      )}
    </Group>
  );
}

function datasetNameForAttribute(
  attribute: Attribute,
  datasets: readonly Dataset.T[] | undefined,
): string | undefined {
  const mapping = attribute.mapping;
  if (mapping?.type !== "dataset_column") {
    return undefined;
  }
  return datasets?.find((dataset) => {
    return dataset.id === mapping.datasetId;
  })?.name;
}
