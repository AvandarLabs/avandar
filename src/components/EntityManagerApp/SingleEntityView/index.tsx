import { Container, Group, Loader, Stack, Text, Title } from "@mantine/core";
import { useMemo } from "react";
import { ObjectDescriptionList } from "@/lib/ui/ObjectDescriptionList";
import { makeMapFromList } from "@/lib/utils/maps/builders";
import { getProp, propIsTrue } from "@/lib/utils/objects/higherOrderFuncs";
import { unknownToString } from "@/lib/utils/strings";
import {
  EntityClient,
  EntityFieldValueRead,
  EntityRead,
} from "@/models/Entity/EntityClient";
import { EntityFieldConfigClient } from "@/models/EntityConfig/EntityFieldConfig/EntityFieldConfigClient";
import { EntityFieldConfig } from "@/models/EntityConfig/EntityFieldConfig/types";
import { EntityConfig } from "@/models/EntityConfig/types";

type HydratedEntity = EntityRead & {
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
  entity: EntityRead;
}): [HydratedEntity, boolean] {
  const [entityFieldConfigs, isLoadingEntityFieldConfigs] =
    EntityFieldConfigClient.useGetAll({
      where: { entity_config_id: { eq: entityConfig.id } },
    });
  const [entityFieldValues, isLoadingEntityFieldValues] =
    EntityClient.useGetAllFields({
      entityId: entity.id,
    });

  const hydratedEntity = useMemo(() => {
    let configInfo = undefined;
    let fieldValuesInfo = undefined;
    let fieldConfigsMap = undefined;

    if (entityFieldConfigs) {
      const idField = entityFieldConfigs.find(propIsTrue("isIdField"));
      const nameField = entityFieldConfigs.find(propIsTrue("isTitleField"));
      fieldConfigsMap = makeMapFromList({
        list: entityFieldConfigs,
        keyFn: getProp("id"),
      });

      configInfo = {
        idField,
        nameField,
        fieldConfigs: entityFieldConfigs,
      };
    }

    if (entityFieldValues) {
      const fieldValuesMap = makeMapFromList({
        list: entityFieldValues,
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
  entity: EntityRead;
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
          entityFieldOptions={{
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
