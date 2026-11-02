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
 * Builds a throwaway Puck `Config` from saved page data alone, so that Puck's
 * `transformProps` can walk the data without the real component registry.
 *
 * `transformProps` needs a config to know which props of a block hold nested
 * blocks (Puck "slots"). The real config lives in the editor and imports
 * React components, so it is not available to migrations or to dashboard
 * preparation code that only has the saved JSON. This function infers the
 * slots from the data instead: any block (an object with a string `type` and
 * `props.id`) whose prop is an array containing other blocks is treated as a
 * slot field on that block's component type.
 *
 * The returned config has one entry per component type found in the data,
 * with only the inferred slot fields. Its `render` throws, so it must be used
 * only for traversal and never for rendering.
 *
 * Used by `transformAvaPageProps`, which in turn powers the page data
 * migrations and dashboard column binding preparation.
 *
 * @param data Saved page data. Its shape is not validated, so anything
 *   unrecognised is ignored.
 * @returns A Puck config describing only the slot fields found in `data`.
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
