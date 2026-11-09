import { useMemo, useReducer } from "react";
import { placeDraftReducer } from "@/views/GisApp/places/placeDraftReducer/placeDraftReducer";
import type { PlaceToolState } from "@/views/GisApp/places/PlaceTool.types";

/**
 * Holds the place tool's draft. The setters never change identity, so the
 * map's click gesture is not re-registered on every keystroke. Owned by
 * `useGisAppState`.
 */
export function usePlaceToolState(): PlaceToolState {
  const [draft, dispatch] = useReducer(placeDraftReducer, undefined);
  const setters = useMemo((): Omit<PlaceToolState, "draft"> => {
    return {
      startNew: () => {
        dispatch({ type: "startNew" });
      },
      startEdit: (options) => {
        dispatch({ type: "startEdit", ...options });
      },
      startMove: (options) => {
        dispatch({ type: "startMove", ...options });
      },
      onPlacePicked: (coordinate) => {
        dispatch({ type: "pickCoordinate", coordinate });
      },
      onSearchResultPicked: (options) => {
        dispatch({ type: "pickSearchResult", ...options });
      },
      clearCoordinate: (values) => {
        dispatch({ type: "clearCoordinate", values });
      },
      close: () => {
        dispatch({ type: "close" });
      },
    };
  }, []);
  return useMemo(() => {
    return { draft, ...setters };
  }, [draft, setters]);
}
