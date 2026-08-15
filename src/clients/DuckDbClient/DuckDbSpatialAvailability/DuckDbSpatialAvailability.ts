/** Whether DuckDB Spatial can currently execute GIS queries. */
export type DuckDbSpatialAvailability = "loading" | "available" | "unavailable";

/** Observable capability state consumed through `useSyncExternalStore`. */
export type DuckDbSpatialAvailabilityStore = {
  getSnapshot: () => DuckDbSpatialAvailability;
  set: (value: DuckDbSpatialAvailability) => void;
  subscribe: (listener: () => void) => () => void;
};

/** Creates an isolated DuckDB Spatial capability store. */
export const createDuckDbSpatialAvailabilityStore =
  (): DuckDbSpatialAvailabilityStore => {
    let availability: DuckDbSpatialAvailability = "loading";
    const listeners = new Set<() => void>();
    return {
      getSnapshot: () => {
        return availability;
      },
      set: (value) => {
        if (value === availability) {
          return;
        }
        availability = value;
        listeners.forEach((listener) => {
          listener();
        });
      },
      subscribe: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    };
  };
