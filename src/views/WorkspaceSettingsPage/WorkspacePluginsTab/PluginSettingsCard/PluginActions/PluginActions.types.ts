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

/**
 * An action that asks the user to confirm before it runs. Install is left
 * out because it opens the install wizard, which is its own confirmation.
 */
export type ConfirmedPluginActionKind = Exclude<PluginActionKind, "install">;
