import type {
  CommandHandler,
  PluginDefinition,
} from "@plugin-sdk/PluginApi.types";

/**
 * True when `value` came from `definePlugin`. The host uses it to check that
 * a plugin's entry module exported a definition before it runs a command.
 */
export function isPluginDefinition(value: unknown): value is PluginDefinition {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { kind, commands } = value as { kind?: unknown; commands?: unknown };
  return (
    kind === "avandar-plugin" &&
    typeof commands === "object" &&
    commands !== null
  );
}

/**
 * Declares a plugin's command handlers. The plugin's entry module must export
 * the result as its default export.
 */
export function definePlugin(
  definition: Readonly<{ commands: Readonly<Record<string, CommandHandler>> }>,
): PluginDefinition {
  return { kind: "avandar-plugin", commands: definition.commands };
}
