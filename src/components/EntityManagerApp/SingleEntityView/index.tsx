import { Container, Group, Loader, Stack, Text, Title } from "@mantine/core";
import { ObjectDescriptionList } from "@ui/ObjectDescriptionList/ObjectDescriptionList";
import { where } from "@utils/filters/where/where";
import { isNonNullish } from "@utils/guards/isNonNullish/isNonNullish";
import { prop } from "@utils/objects/hofs/prop/prop";
import { propEq } from "@utils/objects/hofs/propEq/propEq";
import { makeObject } from "@utils/objects/makeObject/makeObject";
import { omit } from "@utils/objects/omit/omit";
import { unknownToString } from "@utils/strings/unknownToString/unknownToString";
import {
  EntityFieldConfig,
  EntityFieldConfigId,
} from "$/models/EntityConfig/EntityFieldConfig/EntityFieldConfig.types";
import { useMemo } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { EntityFieldConfigClient } from "@/clients/entities/EntityFieldConfigClient";
import { EntityFieldValueClient } from "@/clients/entities/EntityFieldValueClient/EntityFieldValueClient";
import { SourceBadge } from "@/components/common/SourceBadge";
import { Paper } from "@/lib/ui/Paper/Paper";
import { makeIdLookupMap } from "@/lib/utils/maps/makeIdLookupMap/makeIdLookupMap";
import { makeMap } from "@/lib/utils/maps/makeMap/makeMap";
import { ActivityBlock } from "./ActivityBlock";
import { StatusPill } from "./StatusPill";
import type { DatasetSourceType } from "$/models/datasets/Dataset/Dataset.types";
import type { Entity } from "$/models/entities/Entity/Entity.types";
import type { EntityFieldValue } from "$/models/entities/EntityFieldValue/EntityFieldValue.types";
import type { EntityConfig } from "$/models/EntityConfig/EntityConfig.types";

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

/**
 * Hydrates an entity with all its field configs and values.
 */
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
    EntityFieldValueClient.withLogger().useGetEntityFieldValues({
      workspaceId: entity.workspaceId,
      entityId: entity.id,
      entityFieldConfigs: entityFieldConfigs ?? [],
    });

  const datasetIds = useMemo(() => {
    return [
      ...new Set(
        (entityFieldValues ?? []).map(prop("datasetId")).filter(isNonNullish),
      ),
    ];
  }, [entityFieldValues]);

  const [datasets] = DatasetClient.useGetAll(where("id", "in", datasetIds));

  const datasetsMap = useMemo(() => {
    return datasets ? makeMap(datasets, { keyFn: prop("id") }) : undefined;
  }, [datasets]);

  // TODO(jpsyx): move this to a module that can also use cacheing.
  const hydratedEntity = useMemo(() => {
    let configInfo = undefined;
    let fieldValuesInfo = undefined;
    let fieldConfigsMap:
      | Map<EntityFieldConfigId, EntityFieldConfig>
      | undefined = undefined;

    if (entityFieldConfigs) {
      const idField = entityFieldConfigs.find(propEq("isIdField", true));
      const nameField = entityFieldConfigs.find(propEq("isTitleField", true));
      fieldConfigsMap = makeIdLookupMap(entityFieldConfigs);
      configInfo = {
        idField,
        nameField,
        fieldConfigs: entityFieldConfigs,
      };
    }

    if (entityFieldValues) {
      const fieldValuesMap = makeMap(entityFieldValues, {
        keyFn: prop("entityFieldConfigId"),
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
        makeObject(hydratedEntity.fieldValues, {
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
