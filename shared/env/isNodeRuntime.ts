/**
 * Checks if the current environment is Node (determined by the presence of
 * process.env.NODE_ENV). This function can be called from many different
 * environments.
 *
 * @returns True if the current environment is Node, false otherwise.
 */
export function isNodeRuntime(): boolean {
  return (
    typeof process !== "undefined" &&
    process.env !== undefined &&
    !!process.env.NODE_ENV
  );
}
