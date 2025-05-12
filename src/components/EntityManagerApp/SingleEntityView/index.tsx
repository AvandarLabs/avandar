import { Container, Group, Loader, Stack, Text, Title } from "@mantine/core";
import { useMemo } from "react";
import { ObjectDescriptionList } from "@/lib/ui/ObjectDescriptionList";
import { makeMapFromList } from "@/lib/utils/maps/builders";
import { getProp, xpropEquals } from "@/lib/utils/objects/higherOrderFuncs";
import { unknownToString } from "@/lib/utils/strings";
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
  const [entityFieldConfigs, isLoadingEntityFieldConfigs] =
    EntityFieldConfigClient.useGetAll({
      where: { entity_config_id: { eq: entityConfig.id } },
    });
  const [entityFieldValues, isLoadingEntityFieldValues] = EntityClient.ofType(
    entityConfig.id,
  ).useGetAllFields({
    entityId: entity.id,
  });

  const hydratedEntity = useMemo(() => {
    let configInfo = undefined;
    let fieldValuesInfo = undefined;
    let fieldConfigsMap:
      | Map<EntityFieldConfigId, EntityFieldConfig>
      | undefined = undefined;

    if (entityFieldConfigs) {
      const idField = entityFieldConfigs.find(
        xpropEquals("options.isIdField", true),
      );
      const nameField = entityFieldConfigs.find(
        xpropEquals("options.isTitleField", true),
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

  console.log("hydratedEntity", hydratedEntity);

  return (
    <Container pt="lg">
      <Stack>
        <Group>
          <Title order={2}>
            {isLoadingHydratedEntity ?
              <Loader />
            : unknownToString(hydratedEntity.nameFieldValue?.value)}
          </Title>
        </Group>
        <Text>{entityConfig.description}</Text>

        <ObjectDescriptionList
          entity={hydratedEntity}
          excludeKeys={[
            "idField",
            "nameField",
            "nameFieldValue",
            "fieldConfigs",
          ]}
          childRenderOptions={{
            fieldValues: {
              renderAsTable: true,
              excludeKeys: [
                "id",
                "valueSet",
                "entityId",
                "entityFieldConfigId",
              ],
            },
          }}
        />
      </Stack>
    </Container>
  );
}
