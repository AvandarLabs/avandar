/** Keeps the real Puck catalog entry while excluding unused filter clients.
 * A filter is never added to this saved chart. Fail if the film tries to do so.
 */
export function useFilterPBlockConfig() {
  return {
    label: "Filter",
    fields: {},
    defaultProps: {},
    render: () => {
      throw new Error("The dashboard film has no filter block.");
    },
  };
}
