import { List, Table } from "@mantine/core";
import { useMemo } from "react";
import { StringPropertyKey } from "@/lib/types/utilityTypes";
import { EntityDescriptionList } from "@/lib/ui/EntityDescriptionList";
import { CollapsibleItem } from "@/lib/ui/EntityDescriptionList/CollapsibleItem";
import { getEntityFieldRenderOptions } from "@/lib/ui/EntityDescriptionList/helpers";
import {
  EntityArrayRenderOptions,
  EntityObject,
} from "@/lib/ui/EntityDescriptionList/types";
import { UnknownFieldValueItem } from "@/lib/ui/EntityDescriptionList/UnknownFieldValueItem";
import { objectKeys } from "@/lib/utils/objects";
import { camelToTitleCase } from "@/lib/utils/strings";

type Props<T extends EntityObject> = {
  values: readonly T[];
} & EntityArrayRenderOptions<T>;

/**
 * Renders an array of entities either as a table or as a list of
 * collapsible entity descriptions.
 */
export function EntityArrayBlock<T extends EntityObject>({
  values,
  renderAsTable,
  titleKey,
  ...renderOptions
}: Props<T>): JSX.Element | null {
  const excludeKeySet: ReadonlySet<StringPropertyKey<T>> = useMemo(() => {
    return new Set(renderOptions.excludeKeys);
  }, [renderOptions.excludeKeys]);

  if (values.length === 0) {
    return null;
  }

  // render each entity in the array as a row in a table
  if (renderAsTable) {
    const firstEntity = values[0]!;
    const headers = objectKeys(firstEntity)
      .filter((headerKey) => {
        return !excludeKeySet.has(headerKey);
      })
      .map((headerKey) => {
        return (
          <Table.Th key={headerKey} tt="capitalize">
            {camelToTitleCase(headerKey)}
          </Table.Th>
        );
      });

    const rows = values.map((entityRow, idx) => {
      // TODO(pablo): use a stable key
      const entityId = String(entityRow[titleKey ?? "id"] ?? idx);
      return (
        <Table.Tr key={entityId}>
          {objectKeys(entityRow).map((fieldKey) => {
            if (excludeKeySet.has(fieldKey)) {
              return null;
            }
            const fieldVal = entityRow[fieldKey];
            return (
              <Table.Td key={fieldKey}>
                <UnknownFieldValueItem
                  value={fieldVal}
                  {...getEntityFieldRenderOptions(renderOptions, fieldKey)}
                />
              </Table.Td>
            );
          })}
        </Table.Tr>
      );
    });

    return (
      <Table>
        <Table.Thead>
          <Table.Tr>{headers}</Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    );
  }

  // render the entities as a list, where each entity is a collapsible
  // entity description list.
  const listItems = values.map((val, idx) => {
    // TODO(pablo): use a stable key
    const entityId = String(val[titleKey ?? "id"] ?? idx);
    return (
      <CollapsibleItem
        key={entityId}
        label={titleKey ? String(val[titleKey]) : String(idx + 1)}
      >
        <EntityDescriptionList entity={val} {...renderOptions} />
      </CollapsibleItem>
    );
  });

  return (
    <List
      listStyleType="none"
      classNames={{
        itemWrapper: "w-full",
        itemLabel: "w-full",
      }}
    >
      {listItems}
    </List>
  );
}
