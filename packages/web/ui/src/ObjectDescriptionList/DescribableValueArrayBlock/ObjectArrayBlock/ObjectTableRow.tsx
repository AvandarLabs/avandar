import { useBoolean } from "@hooks/useBoolean/useBoolean";
import { Button, Group, Table } from "@mantine/core";
import { EditButton } from "@ui/buttons/EditButton";
import { StringKeyOf } from "@utils/types/utilities.types";
import { useState } from "react";
import { ValueItemContainer } from "@ui/ObjectDescriptionList/ValueItemContainer";
import type {
  AnyDescribableValueRenderOptions,
  DescribableObject,
  GenericRootData,
  GetChildObjects,
  ObjectRowRenderOptions,
} from "@ui/ObjectDescriptionList/ObjectDescriptionList.types";

const ACTION_COLUMN_HEADER_KEY = "__ACTION_COLUMN__";

type HeaderKey<T extends DescribableObject> =
  | StringKeyOf<T>
  | typeof ACTION_COLUMN_HEADER_KEY;

type Props<T extends DescribableObject, RootData extends GenericRootData> = {
  rowObject: T;
  headerKeysToRender: ReadonlyArray<HeaderKey<T>>;
  rootData: RootData;
  parentRenderOptions: AnyDescribableValueRenderOptions;
  itemRenderOptions?: ObjectRowRenderOptions<T, RootData>;
  onSubmitChange?: (newValue: GetChildObjects<RootData>) => void;
};

export function ObjectTableRow<
  T extends DescribableObject,
  RootData extends GenericRootData,
>({
  rowObject,
  headerKeysToRender,
  rootData,
  parentRenderOptions,
  itemRenderOptions,
  onSubmitChange,
}: Props<T, RootData>): JSX.Element {
  const [isEditing, startEditMode, endEditMode] = useBoolean(false);
  const [editedObjectValue, setEditedObjectValue] = useState<T>(rowObject);

  return (
    <Table.Tr>
      {headerKeysToRender.map((fieldKey) => {
        if (fieldKey === ACTION_COLUMN_HEADER_KEY) {
          if (isEditing) {
            return (
              <Table.Td key={fieldKey}>
                <Group gap="xxs">
                  <Button
                    size="compact-sm"
                    variant="light"
                    onClick={() => {
                      onSubmitChange?.(
                        editedObjectValue as GetChildObjects<RootData>,
                      );
                      endEditMode();
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    size="compact-sm"
                    variant="default"
                    onClick={() => {
                      // reset the edited object value to the original
                      setEditedObjectValue(rowObject);
                      endEditMode();
                    }}
                  >
                    Cancel
                  </Button>
                </Group>
              </Table.Td>
            );
          }

          return (
            <Table.Td key={fieldKey}>
              <EditButton
                as="button"
                onClick={() => {
                  startEditMode();
                }}
              />
            </Table.Td>
          );
        }

        const fieldVal = editedObjectValue[fieldKey];

        const childRenderOptions = {
          ...parentRenderOptions,
          ...(itemRenderOptions?.keyRenderOptions?.[
            fieldKey as StringKeyOf<T>
          ] ?? {}),
        } as AnyDescribableValueRenderOptions;

        return (
          <Table.Td key={fieldKey}>
            <ValueItemContainer
              editMode={isEditing}
              onChange={(newValue) => {
                setEditedObjectValue((prev) => {
                  return { ...prev, [fieldKey]: newValue };
                });
              }}
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
}
