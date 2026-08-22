import type { Dispatch, SetStateAction } from "react";

import { useState } from "react";

import { FitBoundsRequest } from "@/views/GisApp/layers/FitBoundsRequest/FitBoundsRequest";
import { ChromePanelState } from "@/views/GisApp/shell/ChromePanelState/ChromePanelState";
import { useMapChromeInsets } from "@/views/GisApp/shell/useMapChromeInsets/useMapChromeInsets";

/** Panel measurements and map-fit controls shared by the GIS shell. */
export type GisAppChrome = ReturnType<typeof useMapChromeInsets> &
  ReturnType<typeof ChromePanelState.useChromePanelState> &
  ReturnType<typeof FitBoundsRequest.useFitBoundsRequest> & {
    isChromeHidden: boolean;
    setIsChromeHidden: Dispatch<SetStateAction<boolean>>;
  };

/** Creates the panel measurements and map-fit controls shared by the shell. */
export function useGisAppChrome(): GisAppChrome {
  const insets = useMapChromeInsets();
  const [isChromeHidden, setIsChromeHidden] = useState(false);
  const { panelState, togglePanel, expandPanel } =
    ChromePanelState.useChromePanelState(window.innerWidth - 200);
  const { fitBoundsRequest, requestFitBounds } =
    FitBoundsRequest.useFitBoundsRequest(insets.insetsRef);

  return {
    ...insets,
    expandPanel,
    fitBoundsRequest,
    isChromeHidden,
    panelState,
    requestFitBounds,
    setIsChromeHidden,
    togglePanel,
  };
}
