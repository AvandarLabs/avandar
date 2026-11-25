/**
 * One data-agent tool a bundled plugin declares in `contributes.aiTools`,
 * flattened with the owning plugin's ID and permissions. The generated
 * `PLUGIN_AI_TOOLS` list is made of these, and the data agent reads them to
 * offer a plugin's tool to the model and to gate it by permission.
 *
 * It is written structurally, with no import of the manifest package, so that
 * code in `shared/` can use it without depending on the plugin toolchain.
 */
export type PluginAiToolDeclaration = {
  /** The ID of the plugin that declares the tool, such as `avandar.hello`. */
  pluginId: string;
  /** The permissions the owning plugin requests. */
  permissions: readonly string[];
  name: string;
  description: string;
  /** The JSON Schema the model fills in to call the tool. */
  parameters: {
    type: "object";
    additionalProperties: false;
    required: readonly string[];
    properties: Readonly<
      Record<
        string,
        {
          type: "string" | "number" | "boolean";
          description?: string;
          enum?: ReadonlyArray<string | number | boolean>;
        }
      >
    >;
  };
};
