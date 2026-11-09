/**
 * Why a plugin API call failed.
 *
 * - `PermissionDenied`: the plugin did not request, or was not granted, the
 *   permission the call needs.
 * - `InvalidHandle`: the call named a `QueryHandle` the host does not know,
 *   or the Data Explorer no longer shows the result the command was invoked
 *   on.
 * - `LoadFailed`: the plugin's code or data could not be loaded.
 * - `CommandFailed`: a command handler, or SDK code it called, threw.
 * - `InvalidExpression`: `avandar.dataExplorer.addColumns` got a column it
 *   cannot add: a bad name, a placeholder with no input, an input naming a
 *   column the result does not have, an expression that is not exactly one
 *   SQL scalar or window expression, or an empty list.
 */
export type PluginErrorCode =
  | "PermissionDenied"
  | "InvalidHandle"
  | "LoadFailed"
  | "CommandFailed"
  | "InvalidExpression";

/**
 * A typed error from the plugin API. A plugin command can branch on `code`
 * to recover from one failure, such as an invalid handle, and rethrow others.
 */
export class PluginError extends Error {
  readonly code: PluginErrorCode;

  constructor(code: PluginErrorCode, message: string) {
    super(message);
    this.name = "PluginError";
    this.code = code;
  }
}
