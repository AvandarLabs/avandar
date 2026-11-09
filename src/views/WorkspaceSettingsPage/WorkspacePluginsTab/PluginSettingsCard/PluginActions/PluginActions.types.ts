/**
 * One thing a plugin's settings card can do to the plugin, shown as a
 * button. Which kinds a card offers depends on the plugin's install status.
 */
export type PluginActionKind =
  | "install"
  | "review"
  | "enable"
  | "disable"
  | "uninstall";
