import { List, Table, Text } from "@mantine/core";
import { useMemo } from "react";
import { StringKeyOf } from "type-fest";
import { objectKeys } from "@/lib/utils/objects/misc";
import { camelToTitleCase } from "@/lib/utils/strings/transformations";
import { CollapsibleItem } from "../CollapsibleItem";
import {
  AnyDescribableValueRenderOptions,
  DescribableObject,
  ObjectArrayRenderOptions,
} from "../types";
import { ValueItemContainer } from "../ValueItemContainer";

type Props<T extends DescribableObject> = {
  values: readonly T[];
  maxItemsCount?: number;
} & ObjectArrayRenderOptions<T>;

/**
 * Renders an array of entities either as a table or as a list of
 * collapsible entity descriptions.
 */
export function ObjectArrayBlock<T extends DescribableObject>({
  values,
  renderAsTable,
  titleKey,
  itemRenderOptions,
  maxItemsCount,
  ...primitiveValueRenderOptions
}: Props<T>): JSX.Element | null {
  const excludeKeySet: ReadonlySet<StringKeyOf<T>> = useMemo(() => {
    return new Set(itemRenderOptions?.excludeKeys);
  }, [itemRenderOptions?.excludeKeys]);

  const valuesToRender = useMemo(() => {
    return maxItemsCount === undefined ? values : (
        values.slice(0, maxItemsCount)
      );
  }, [values, maxItemsCount]);

  if (valuesToRender.length === 0) {
    return null;
  }

  // get the primitive value render options from the parent, and override
  // them with the current `itemRenderOptions`
  const parentRenderOptions = {
    ...primitiveValueRenderOptions,
    ...itemRenderOptions,
  };

  // render each entity in the array as a row in a table
  if (renderAsTable) {
    const firstEntity = valuesToRender[0]!;
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

    const rows = valuesToRender.map((entityRow, idx) => {
      // TODO(jpsyx): use a stable key
      const entityId = String(entityRow[titleKey ?? "id"] ?? idx);
      return (
        <Table.Tr key={entityId}>
          {objectKeys(entityRow).map((fieldKey) => {
            if (excludeKeySet.has(fieldKey)) {
              return null;
            }
            const fieldVal = entityRow[fieldKey];

            // compute the child render options to pass down
            const childRenderOptions: AnyDescribableValueRenderOptions = {
              ...parentRenderOptions,
              ...(itemRenderOptions?.childRenderOptions?.[fieldKey] ?? {}),
            };

            return (
              <Table.Td key={fieldKey}>
                <ValueItemContainer
                  type="unknown"
                  value={fieldVal}
                  {...childRenderOptions}
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
  const listItems = valuesToRender.map((val, idx) => {
    // TODO(jpsyx): use a stable key
    const entityId = String(val[titleKey ?? "id"] ?? idx);

    return (
      <CollapsibleItem
        key={entityId}
        label={titleKey ? String(val[titleKey]) : String(idx + 1)}
      >
        {/* We intentionally pass the `parentRenderOptions` because the
          child-specific render options will be computed inside the object
          description list */}
        <ValueItemContainer
          type="object"
          value={val}
          {...parentRenderOptions}
        />
      </CollapsibleItem>
    );
  });

  const moreText =
    valuesToRender.length < values.length ?
      <Text>... and {values.length - valuesToRender.length} more</Text>
    : null;

  return (
    <>
      <List
        listStyleType="none"
        classNames={{
          itemWrapper: "w-full",
          itemLabel: "w-full",
        }}
      >
        {listItems}
      </List>
      {moreText}
    </>
  );
}
