import { Container, Group, Loader, Stack, Text, Title } from "@mantine/core";
import { useMemo } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { EntityFieldValueClient } from "@/clients/entities/EntityFieldValueClient";
import { SourceBadge } from "@/components/common/SourceBadge";
import { ObjectDescriptionList } from "@/lib/ui/ObjectDescriptionList";
import { Paper } from "@/lib/ui/Paper";
import { where } from "@/lib/utils/filters/filterBuilders";
import { isNotNullOrUndefined } from "@/lib/utils/guards";
import { makeMapFromList } from "@/lib/utils/maps/builders";
import { makeObjectFromList } from "@/lib/utils/objects/builders";
import { getProp, propEquals } from "@/lib/utils/objects/higherOrderFuncs";
import { omit } from "@/lib/utils/objects/misc";
import { unknownToString } from "@/lib/utils/strings/transformations";
import { DatasetSourceType } from "@/models/datasets/Dataset";
import { Entity } from "@/models/entities/Entity";
import { EntityFieldValue } from "@/models/entities/EntityFieldValue";
import { EntityFieldConfigClient } from "@/models/EntityConfig/EntityFieldConfig/EntityFieldConfigClient";
import {
  EntityFieldConfig,
  EntityFieldConfigId,
} from "@/models/EntityConfig/EntityFieldConfig/types";
import { EntityConfig } from "@/models/EntityConfig/types";
import { ActivityBlock } from "./ActivityBlock";
import { StatusPill } from "./StatusPill";

type HydratedEntity = Entity & {
  idField?: EntityFieldConfig;
  nameField?: EntityFieldConfig;
  fieldConfigs?: EntityFieldConfig[];
  fieldValues?: Array<
    EntityFieldValue & {
      fieldName?: string;
      sourceType?: DatasetSourceType;
      sourceName?: string;
    }
  >;
  nameFieldValue?: EntityFieldValue;
};

function useHydratedEntity({
  entityConfig,
  entity,
}: {
  entityConfig: EntityConfig;
  entity: Entity;
}): [HydratedEntity, boolean] {
  // TODO(jpsyx): move this to a generalized implementation of useHydration
  const [entityFieldConfigs, isLoadingEntityFieldConfigs] =
    EntityFieldConfigClient.useGetAll({
      where: { entity_config_id: { eq: entityConfig.id } },
    });
  const [entityFieldValues, isLoadingEntityFieldValues] =
    EntityFieldValueClient.useGetAll(where("entity_id", "eq", entity.id));

  const datasetIds = useMemo(() => {
    return [
      ...new Set(
        (entityFieldValues ?? [])
          .map(getProp("datasetId"))
          .filter(isNotNullOrUndefined),
      ),
    ];
  }, [entityFieldValues]);

  const [datasets] = DatasetClient.useGetAll(where("id", "in", datasetIds));

  const datasetsMap = useMemo(() => {
    return datasets ?
        makeMapFromList(datasets, { keyFn: getProp("id") })
      : undefined;
  }, [datasets]);

  // TODO(jpsyx): move this to a module that can also use cacheing.
  const hydratedEntity = useMemo(() => {
    let configInfo = undefined;
    let fieldValuesInfo = undefined;
    let fieldConfigsMap:
      | Map<EntityFieldConfigId, EntityFieldConfig>
      | undefined = undefined;

    if (entityFieldConfigs) {
      const idField = entityFieldConfigs.find(
        propEquals("options.isIdField", true),
      );
      const nameField = entityFieldConfigs.find(
        propEquals("options.isTitleField", true),
      );
      fieldConfigsMap = makeMapFromList(entityFieldConfigs, {
        keyFn: getProp("id"),
      });

      configInfo = {
        idField,
        nameField,
        fieldConfigs: entityFieldConfigs,
      };
    }

    if (entityFieldValues) {
      const fieldValuesMap = makeMapFromList(entityFieldValues, {
        keyFn: getProp("entityFieldConfigId"),
        valueFn: (fieldValue) => {
          const config = fieldConfigsMap?.get(fieldValue.entityFieldConfigId);
          const dataset =
            fieldValue.datasetId ?
              datasetsMap?.get(fieldValue.datasetId)
            : undefined;
          return {
            ...fieldValue,
            fieldName: config?.name,
            sourceType: dataset?.sourceType ?? dataset?.sourceType,
            sourceName: dataset?.name,
          };
        },
      });

      const nameFieldId = configInfo?.nameField?.id;

      fieldValuesInfo = {
        fieldValues: [...fieldValuesMap.values()],
        nameFieldValue:
          nameFieldId ? fieldValuesMap.get(nameFieldId) : undefined,
      };
    }

    return {
      ...entity,
      ...configInfo,
      ...fieldValuesInfo,
    };
  }, [entity, entityFieldConfigs, entityFieldValues, datasetsMap]);

  return [
    hydratedEntity,
    isLoadingEntityFieldConfigs || isLoadingEntityFieldValues,
  ];
}

type Props = {
  entityConfig: EntityConfig;
  entity: Entity;
};

type FieldValueMetadata = {
  value: EntityFieldValue["value"];
  sourceType?: DatasetSourceType;
  sourceName?: string;
};

export function SingleEntityView({ entityConfig, entity }: Props): JSX.Element {
  const [hydratedEntity, isLoadingHydratedEntity] = useHydratedEntity({
    entityConfig,
    entity,
  });

  const [entityMetadata, fieldValues] = useMemo(() => {
    // convert the field values array into a record
    const fieldValuesRecord: Record<string, FieldValueMetadata> | undefined =
      hydratedEntity.fieldValues ?
        makeObjectFromList(hydratedEntity.fieldValues, {
          keyFn: (fieldValue) => {
            return fieldValue.fieldName ?? "Loading...";
          },
          valueFn: (fieldValue) => {
            return {
              value: fieldValue.value,
              sourceType: fieldValue.sourceType,
              sourceName: fieldValue.sourceName,
            };
          },
        })
      : undefined;

    return [omit(hydratedEntity, "fieldValues"), fieldValuesRecord];
  }, [hydratedEntity]);

  return (
    <Container pt="xxl">
      <Stack>
        <Group>
          <Title order={2}>
            {isLoadingHydratedEntity ?
              <Loader />
            : unknownToString(hydratedEntity.name)}
          </Title>
          <StatusPill />
        </Group>
        <Paper>
          <Stack>
            <Text>{entityConfig.description}</Text>
            <ObjectDescriptionList
              data={entityMetadata}
              dateFormat="MMMM D, YYYY"
              excludeKeys={[
                "id",
                "externalId",
                "entityConfigId",
                "idField",
                "nameField",
                "nameFieldValue",
                "fieldConfigs",
                "workspaceId",
              ]}
            />

            <Title order={4}>Data</Title>
            {fieldValues === undefined ?
              <Loader />
            : <ObjectDescriptionList
                data={fieldValues}
                dateFormat="MMMM D, YYYY"
                renderObjectKeyLabel={(key, obj) => {
                  const { sourceType, sourceName } = obj[key]!;
                  return (
                    <Group gap="xs" wrap="nowrap" align="center">
                      <SourceBadge
                        sourceType={sourceType}
                        sourceName={sourceName}
                      />
                      <Text fw={500}>{key}</Text>
                    </Group>
                  );
                }}
                itemRenderOptions={{
                  getRenderableValue: "value",
                }}
              />
            }

            <ActivityBlock />
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
