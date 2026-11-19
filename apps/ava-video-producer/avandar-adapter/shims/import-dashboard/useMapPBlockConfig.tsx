type MapPBlockConfig = {
  label: string;
  fields: Record<never, never>;
  defaultProps: Record<never, never>;
  render: () => never;
};

/** Keeps the real Puck catalog entry while excluding the map block's DuckDB
 * and map clients, which cannot run in a browser bundle without a backend.
 * A map is never added to the dashboard film. Fail if the film tries to do so.
 */
export function useMapPBlockConfig(): MapPBlockConfig {
  return {
    label: "Map",
    fields: {},
    defaultProps: {},
    render: () => {
      throw new Error("The dashboard film has no map block.");
    },
  };
}
