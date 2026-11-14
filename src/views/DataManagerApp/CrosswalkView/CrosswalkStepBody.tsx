import { ChooseDatasetsStep } from "@/views/DataManagerApp/CrosswalkView/ChooseDatasetsStep/ChooseDatasetsStep";
import { MapLayoutsStep } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MapLayoutsStep";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { CrosswalkCatalog } from "@/views/DataManagerApp/CrosswalkView/useCrosswalkCatalog/useCrosswalkCatalog";
import type { CrosswalkFlow } from "@/views/DataManagerApp/CrosswalkView/useCrosswalkFlow/useCrosswalkFlow";
import type { ReactNode } from "react";

/** What every crosswalk step receives. */
export type CrosswalkStepProps = {
  flow: CrosswalkFlow;
  catalog: CrosswalkCatalog;
  /** The saved crosswalk row; undefined before the first save. */
  crosswalk: Crosswalk.T | undefined;
};

/** The crosswalk's current step. */
export function CrosswalkStepBody(
  props: Readonly<CrosswalkStepProps>,
): ReactNode {
  switch (props.flow.step) {
    case "datasets":
      return <ChooseDatasetsStep {...props} />;
    case "map":
      return <MapLayoutsStep {...props} />;
    case "combine":
      return <div data-crosswalk-step="combine" />;
  }
}
