import { objectValuesMap } from "@avandar/utils";
import type { Config, Field } from "@puckeditor/core";

type SlotDescriptor = { componentType: string; fields: Record<string, Field> };

function _isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function _getDescriptor(
  value: Record<string, unknown>,
): SlotDescriptor | undefined {
  if (
    typeof value.type !== "string" ||
    !_isRecord(value.props) ||
    typeof value.props.id !== "string"
  ) {
    return undefined;
  }
  const fields = Object.fromEntries(
    Object.entries(value.props)
      .filter(([, field]) => {
        return (
          Array.isArray(field) &&
          field.some((child) => {
            return (
              _isRecord(child) &&
              typeof child.type === "string" &&
              _isRecord(child.props)
            );
          })
        );
      })
      .map(([key]) => {
        return [key, { type: "slot" as const }];
      }),
  );
  return { componentType: value.type, fields };
}

function _getDescriptors(value: unknown): SlotDescriptor[] {
  if (Array.isArray(value)) {
    return value.flatMap(_getDescriptors);
  }
  if (!_isRecord(value)) {
    return [];
  }
  const descriptor = _getDescriptor(value);
  return [
    ...(descriptor ? [descriptor] : []),
    ...Object.values(value).flatMap(_getDescriptors),
  ];
}

/**
 * Returns slot metadata for structural traversal of saved content and zones.
 */
export function makeTraversalConfigFromAvaPageData(data: unknown): Config {
  const fieldsByType = _getDescriptors(data).reduce<
    Record<string, Record<string, Field>>
  >((fields, descriptor) => {
    return {
      ...fields,
      [descriptor.componentType]: {
        ...fields[descriptor.componentType],
        ...descriptor.fields,
      },
    };
  }, {});
  return {
    components: objectValuesMap(fieldsByType, (fields) => {
      return {
        fields,
        render: () => {
          throw new Error("Structural traversal cannot render components");
        },
      };
    }),
  };
}
