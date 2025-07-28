import { Container, Group, Loader, Stack, Text, Title } from "@mantine/core";
import { useMemo } from "react";
import { ObjectDescriptionList } from "@/lib/ui/ObjectDescriptionList";
import { makeMapFromList } from "@/lib/utils/maps/builders";
import { makeObjectFromList } from "@/lib/utils/objects/builders";
import { getProp, propEquals } from "@/lib/utils/objects/higherOrderFuncs";
import { omit } from "@/lib/utils/objects/misc";
import { unknownToString } from "@/lib/utils/strings/transformations";
import {
  EntityClient,
  EntityFieldValueRead,
} from "@/models/Entity/EntityClient";
import { Entity } from "@/models/Entity/types";
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
    EntityFieldValueRead & {
      fieldName?: string;
    }
  >;
  nameFieldValue?: EntityFieldValueRead;
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
  const [entityFieldValues, isLoadingEntityFieldValues] = EntityClient.ofType(
    entityConfig.id,
  ).useGetAllFields({
    entityId: entity.id,
  });

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
          return {
            ...fieldValue,
            fieldName: fieldConfigsMap?.get(fieldValue.entityFieldConfigId)
              ?.name,
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
  }, [entity, entityFieldConfigs, entityFieldValues]);

  return [
    hydratedEntity,
    isLoadingEntityFieldConfigs || isLoadingEntityFieldValues,
  ];
}

type Props = {
  entityConfig: EntityConfig;
  entity: Entity;
};

export function SingleEntityView({ entityConfig, entity }: Props): JSX.Element {
  const [hydratedEntity, isLoadingHydratedEntity] = useHydratedEntity({
    entityConfig,
    entity,
  });

  const [entityMetadata, fieldValues] = useMemo(() => {
    // convert the field values array into a record
    const fieldValuesRecord =
      hydratedEntity.fieldValues ?
        makeObjectFromList(hydratedEntity.fieldValues, {
          keyFn: (fieldValue) => {
            return fieldValue.fieldName ?? "Loading...";
          },
          valueFn: getProp("value"),
        })
      : undefined;

    return [omit(hydratedEntity, "fieldValues"), fieldValuesRecord];
  }, [hydratedEntity]);

  return (
    <Container pt="lg">
      <Stack>
        <Group>
          <Title order={2}>
            {isLoadingHydratedEntity ?
              <Loader />
            : unknownToString(hydratedEntity.nameFieldValue?.value)}
          </Title>
          <StatusPill />
        </Group>
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
        : <ObjectDescriptionList data={fieldValues} dateFormat="MMMM D, YYYY" />
        }

        <ActivityBlock />
      </Stack>
    </Container>
  );
}
