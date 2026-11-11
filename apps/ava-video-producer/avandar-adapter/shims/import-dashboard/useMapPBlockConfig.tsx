/** Keeps the real Puck catalog entry while excluding the map block's DuckDB
 * and map clients, which cannot run in a browser bundle without a backend.
 * A map is never added to the dashboard film. Fail if the film tries to do so.
 */
export function useMapPBlockConfig() {
  return {
    label: "Map",
    fields: {},
    defaultProps: {},
    render: () => {
      throw new Error("The dashboard film has no map block.");
    },
  };
}
