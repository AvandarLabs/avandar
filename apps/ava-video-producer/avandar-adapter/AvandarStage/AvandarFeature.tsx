import { AttributeMappingScreen } from "../AttributeMappingScreen/AttributeMappingScreen";
import { CasesScreen } from "../CasesScreen/CasesScreen";
import { DashboardScreen } from "../DashboardScreen/DashboardScreen";
import { ExplorerScreen } from "../ExplorerScreen/ExplorerScreen";
import { ImportScreen } from "../ImportScreen/ImportScreen";
import { MapScreen } from "../MapScreen/MapScreen";
import { OntologyScreen } from "../OntologyScreen/OntologyScreen";
import type { AvandarStage } from "./AvandarStage";
import type { ReactNode, ComponentProps } from "react";

type Props = Required<ComponentProps<typeof AvandarStage>>;
/** Render the selected product fixture while preserving its frame contract. */
export function AvandarFeature({
  feature,
  frame,
  width,
  height,
  mode,
}: Readonly<Props>): ReactNode {
  switch (feature) {
    case "import":
      return <ImportScreen frame={frame} width={width} height={height} />;
    case "explorer":
      return (
        <ExplorerScreen
          frame={frame}
          width={width}
          height={height}
          mode={mode}
        />
      );
    case "dashboards":
      return <DashboardScreen frame={frame} width={width} height={height} />;
    case "cases":
      return <CasesScreen frame={frame} width={width} height={height} />;
    case "map":
      return <MapScreen frame={frame} width={width} height={height} />;
    case "ontology":
      return <OntologyScreen frame={frame} width={width} height={height} />;
    case "attribute-mapping":
      return (
        <AttributeMappingScreen frame={frame} width={width} height={height} />
      );
  }
}
