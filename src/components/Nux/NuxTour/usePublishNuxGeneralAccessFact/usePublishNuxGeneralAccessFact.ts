import type { ResourceType } from "@/clients/permissions/ResourceShareClient";
import type { GeneralAccessValue } from "@/components/permissions/ShareResourceModal/GeneralAccessModule/GeneralAccessModule";

import { useLayoutEffect } from "react";

import { NuxStepFactsStore } from "@/components/Nux/NuxTour/NuxStepFactsStore/NuxStepFactsStore";

type Options = {
  resourceType: ResourceType;
  displayedValue: GeneralAccessValue;
};

/**
 * Keeps the tutorial's `generalAccessIsWorkspace` fact in sync with the
 * share dropdown, including the initial value. The role tooltip is gated on
 * that fact, so publishing only on change would skip it when workspace is
 * already selected.
 */
export function usePublishNuxGeneralAccessFact(
  options: Readonly<Options>,
): void {
  const { resourceType, displayedValue } = options;
  useLayoutEffect(
    function publishGeneralAccessFact() {
      if (resourceType !== "dashboard") {
        return;
      }
      NuxStepFactsStore.setGeneralAccessIsWorkspace(
        displayedValue === "workspace",
      );
      return () => {
        NuxStepFactsStore.setGeneralAccessIsWorkspace(false);
      };
    },
    [displayedValue, resourceType],
  );
}
