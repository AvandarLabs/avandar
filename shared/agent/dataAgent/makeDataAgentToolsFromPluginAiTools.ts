import {
  bool,
  num,
  obj,
  oneOf,
  opt,
  str,
  type Optional,
  type Schema,
} from "@earendil-works/pi-schema";

import type { PluginAiToolDeclaration } from "$/agent/dataAgent/pluginAiTools.types.ts";

type PluginAiToolProperty =
  PluginAiToolDeclaration["parameters"]["properties"][string];

/**
 * Turns a camelCase tool name into a sentence-case label, such as
 * `fitRegression` into `Fit regression`, for showing a tool to the user.
 */
export function makeDataAgentToolLabelFromName(name: string): string {
  const spaced = name.replace(/(?<=.)[A-Z]/g, (capital) => {
    return ` ${capital.toLowerCase()}`;
  });
  return `${spaced.charAt(0).toUpperCase()}${spaced.slice(1)}`;
}

function _buildPropertySchema(property: PluginAiToolProperty): Schema {
  const options = { description: property.description };
  if (property.enum !== undefined) {
    return oneOf(property.enum, options);
  }
  if (property.type === "number") {
    return num(options);
  }
  return property.type === "boolean" ? bool(options) : str(options);
}

function _buildParameters(
  parameters: PluginAiToolDeclaration["parameters"],
): Schema {
  const properties: Record<string, Schema | Optional> = {};
  Object.entries(parameters.properties).forEach(([name, property]) => {
    const schema = _buildPropertySchema(property);
    properties[name] = parameters.required.includes(name)
      ? schema
      : opt(schema);
  });
  return obj(properties);
}

/**
 * Converts the data-agent tools bundled plugins declare into the Pi tool
 * shape the data agent offers a model: name, label, description, and an
 * argument schema built from the declaration's JSON Schema.
 */
export function makeDataAgentToolsFromPluginAiTools(
  tools: readonly PluginAiToolDeclaration[],
): Array<{
  name: string;
  label: string;
  description: string;
  parameters: Schema;
}> {
  return tools.map((tool) => {
    return {
      name: tool.name,
      label: makeDataAgentToolLabelFromName(tool.name),
      description: tool.description,
      parameters: _buildParameters(tool.parameters),
    };
  });
}
