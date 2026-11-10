import type {
  AiToolHandler,
  CommandHandler,
  PluginDefinition,
} from "@plugin-sdk/PluginApi.types";
import type { PluginVizDefinition } from "@plugin-sdk/PluginViz.types";

function _isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

/**
 * True when `value` came from `definePlugin`. The host uses it to check that
 * a plugin's entry module exported a definition before it runs a command or
 * draws a chart.
 */
export function isPluginDefinition(value: unknown): value is PluginDefinition {
  if (!_isObject(value)) {
    return false;
  }
  const { kind, commands, vizTypes, aiTools } = value as {
    kind?: unknown;
    commands?: unknown;
    vizTypes?: unknown;
    aiTools?: unknown;
  };
  return (
    kind === "avandar-plugin" &&
    _isObject(commands) &&
    _isObject(vizTypes) &&
    (aiTools === undefined || _isObject(aiTools))
  );
}

/**
 * Declares a plugin's command handlers, chart types, and AI tool handlers,
 * each keyed by the id its `ava.yaml` declares. Any may be left out when the
 * plugin has none. The plugin's entry module must export the result as its
 * default export.
 */
export function definePlugin({
  commands = {},
  vizTypes = {},
  aiTools = {},
}: Readonly<{
  commands?: Readonly<Record<string, CommandHandler>>;
  vizTypes?: Readonly<Record<string, PluginVizDefinition>>;
  aiTools?: Readonly<Record<string, AiToolHandler>>;
}>): PluginDefinition {
  return { kind: "avandar-plugin", commands, vizTypes, aiTools };
}
