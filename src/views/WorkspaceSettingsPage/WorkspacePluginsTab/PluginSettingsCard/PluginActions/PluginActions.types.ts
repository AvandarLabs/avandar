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

/**
 * What a plugin's card knows about the datasets the plugin imported into
 * this workspace. `loading` means the lookup is loading or refetching, so the
 * answer is not yet known. `failed` means the lookup failed and the answer
 * stays unknown. `none` and `some` are answers from a fresh, successful lookup.
 */
export type ImportedDatasetsState = "loading" | "failed" | "none" | "some";
