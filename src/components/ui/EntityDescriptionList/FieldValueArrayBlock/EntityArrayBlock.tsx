import { List, Table } from "@mantine/core";
import { useMemo } from "react";
import * as R from "remeda";
import { camelToTitleCase } from "@/utils/strings";
import { CollapsibleItem } from "../CollapsibleItem";
import { EntityDescriptionList } from "../EntityDescriptionList";
import { getEntityFieldRenderOptions } from "../helpers";
import { EntityArrayRenderOptions, EntityObject } from "../types";
import { UnknownFieldValueItem } from "../UnknownFieldValueItem";

type Props<T extends EntityObject, K extends keyof T = keyof T> = {
  values: readonly T[];
} & EntityArrayRenderOptions<T, K>;

/**
 * Renders an array of entities either as a table or as a list of
 * collapsible entity descriptions.
 */
export function EntityArrayBlock<
  T extends EntityObject,
  K extends keyof T = keyof T,
>({
  values,
  renderAsTable,
  titleKey,
  ...renderOptions
}: Props<T, K>): JSX.Element | null {
  const excludeKeySet: ReadonlySet<K> = useMemo(() => {
    return new Set(renderOptions.excludeKeys);
  }, [renderOptions.excludeKeys]);

  if (values.length === 0) {
    return null;
  }

  // render each entity in the array as a row in a table
  if (renderAsTable) {
    const firstEntity = values[0]!;
    const headers = R.pipe(
      R.keys(firstEntity) as K[],
      R.filter((headerKey) => {
        return !excludeKeySet.has(headerKey);
      }),
      R.map((headerKey) => {
        return (
          <Table.Th key={String(headerKey)} tt="capitalize">
            {camelToTitleCase(String(headerKey))}
          </Table.Th>
        );
      }),
    );

    const rows = values.map((entityRow, idx) => {
      // TODO(pablo): use a stable key
      const entityId = String(entityRow[titleKey ?? "id"] ?? idx);
      return (
        <Table.Tr key={entityId}>
          {(R.keys(entityRow) as K[]).map((fieldKey: K) => {
            if (excludeKeySet.has(fieldKey)) {
              return null;
            }

            const fieldVal = entityRow[fieldKey];
            return (
              <Table.Td key={String(fieldKey)}>
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
