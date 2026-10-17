import type { Config, Field } from "@puckeditor/core";

function _isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Creates slot metadata for structural traversal of saved Puck content and
 * zones.
 */
export function createAvaPageTraversalConfig(data: unknown): Config {
  const components: Config["components"] = {};
  const fieldsByType = new Map<string, Record<string, Field>>();
  function visit(value: unknown): void {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!_isRecord(value)) {
      return;
    }
    if (
      typeof value.type === "string" &&
      _isRecord(value.props) &&
      typeof value.props.id === "string"
    ) {
      const fields = fieldsByType.get(value.type) ?? {};
      fieldsByType.set(value.type, fields);
      Object.entries(value.props).forEach(([key, field]) => {
        if (
          Array.isArray(field) &&
          field.some((child) => {
            return (
              _isRecord(child) &&
              typeof child.type === "string" &&
              _isRecord(child.props)
            );
          })
        ) {
          fields[key] = { type: "slot" };
        }
      });
      components[value.type] = {
        fields,
        render: () => {
          throw new Error("Structural traversal cannot render components");
        },
      };
    }
    Object.values(value).forEach(visit);
  }
  visit(data);
  return { components };
}
