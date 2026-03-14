import { List, Table, Text } from "@mantine/core";
import { objectKeys } from "@utils/objects/objectKeys";
import { StringKeyOf } from "@utils/types/utilityTypes";
import { useMemo } from "react";
import { CollapsibleItem } from "../CollapsibleItem";
import { getOrderedKeys } from "../gerOrderedKeys/getOrderedKeys";
import { getObjectKeyTransformFn } from "../getObjectKeyTransformFn";
import { ValueItemContainer } from "../ValueItemContainer";
import type {
  AnyDescribableValueRenderOptions,
  DescribableObject,
  GenericRootData,
  ObjectArrayRenderOptions,
  ObjectRenderOptions,
} from "../ObjectDescriptionList.types";

const DEFAULT_EXCLUDE_KEYS_PATTERN = "_";
const ACTION_COLUMN_HEADER_KEY = "__ACTION_COLUMN__";

type Props<T extends DescribableObject, RootData extends GenericRootData> = {
  values: readonly T[];
  maxItemsCount?: number;
  rootData: RootData;
} & ObjectArrayRenderOptions<T, RootData>;

/**
 * Renders an array of entities either as a table or as a list of
 * collapsible entity descriptions.
 */
export function ObjectArrayBlock<
  T extends DescribableObject,
  RootData extends GenericRootData,
>({
  values,
  rootData,
  itemRenderOptions,
  maxItemsCount,
  ...moreRenderOptions
}: Props<T, RootData>): JSX.Element | null {
  const valuesToRender = useMemo(() => {
    return maxItemsCount === undefined ? values : (
        values.slice(0, maxItemsCount)
      );
  }, [values, maxItemsCount]);

  if (valuesToRender.length === 0) {
    return null;
  }

  // render each entity in the array as a row in a table
  if (moreRenderOptions.renderAsTable) {
    const {
      idKey,
      renderTableHeader,
      renderActionColumn,
      ...primitiveValueRenderOptions
    } = moreRenderOptions;

    // get the primitive value render options from the parent, and override
    // them with the current `itemRenderOptions`
    const parentRenderOptions = {
      ...primitiveValueRenderOptions,
      ...itemRenderOptions,
    };

    const firstEntity = valuesToRender[0]!;
    const {
      includeKeys = [],
      excludeKeys = [],
      excludeKeysPattern = DEFAULT_EXCLUDE_KEYS_PATTERN,
      renderObjectKeyTransform = "camel-to-title-case",
    } = itemRenderOptions ?? {};

    const headerKeys = getOrderedKeys({
      allKeys: objectKeys(firstEntity),
      includeKeys,
      excludeKeys,
      excludeKeysPattern,
    });

    const headerKeysToRender: Array<
      StringKeyOf<T> | typeof ACTION_COLUMN_HEADER_KEY
    > =
      renderActionColumn ?
        [...headerKeys, ACTION_COLUMN_HEADER_KEY]
      : headerKeys;

    const headers = headerKeysToRender.map((headerKey) => {
      const customRenderedHeader =
        renderTableHeader ? renderTableHeader(headerKey, rootData) : undefined;

      if (headerKey === ACTION_COLUMN_HEADER_KEY) {
        return <Table.Th key={headerKey}>Actions</Table.Th>;
      }

      return (
        <Table.Th key={headerKey}>
          {customRenderedHeader !== undefined ?
            customRenderedHeader
          : getObjectKeyTransformFn(renderObjectKeyTransform)(headerKey)}
        </Table.Th>
      );
    });

    const rows = valuesToRender.map((rowObject, idx) => {
      const rowId = String(rowObject[idKey ?? "id"] ?? idx);
      return (
        <Table.Tr key={rowId}>
          {headerKeysToRender.map((fieldKey) => {
            if (fieldKey === ACTION_COLUMN_HEADER_KEY && renderActionColumn) {
              return (
                <Table.Td key={fieldKey}>
                  {renderActionColumn(rowObject, rootData)}
                </Table.Td>
              );
            }

            const fieldVal = rowObject[fieldKey];

            // compute the child's render options to pass down
            const childRenderOptions = {
              ...parentRenderOptions,
              ...(itemRenderOptions?.keyRenderOptions?.[
                fieldKey as StringKeyOf<T>
              ] ?? {}),
            } as AnyDescribableValueRenderOptions;

            return (
              <Table.Td key={fieldKey}>
                <ValueItemContainer
                  type="unknown"
                  value={fieldVal}
                  rootData={rootData}
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

  const { idKey, defaultExpanded, titleKey, ...primitiveValueRenderOptions } =
    moreRenderOptions;

  // get the primitive value render options from the parent, and override
  // them with the current `itemRenderOptions`
  const parentRenderOptions = {
    ...primitiveValueRenderOptions,
    ...itemRenderOptions,
  };

  // render the entities as a list, where each entity is a collapsible
  // entity description list.
  const listItems = valuesToRender.map((val, idx) => {
    // TODO(jpsyx): use a stable key
    const entityId = String(val[idKey ?? "id"] ?? idx);

    return (
      <CollapsibleItem
        key={entityId}
        label={titleKey ? String(val[titleKey]) : String(idx + 1)}
        defaultOpen={defaultExpanded}
      >
        {/* We intentionally pass the `parentRenderOptions` because the
          child-specific render options will be computed inside the object
          description list */}
        <ValueItemContainer
          type="object"
          value={val}
          rootData={rootData}
          {...(parentRenderOptions as ObjectRenderOptions<
            DescribableObject,
            RootData
          >)}
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
