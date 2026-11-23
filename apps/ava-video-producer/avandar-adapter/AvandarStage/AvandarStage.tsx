import { i18n } from "@lingui/core";
import { compileMessage } from "@lingui/message-utils/compileMessage";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import slateCss from "@/components/layouts/AppSlate/AppSlate.module.css";
import "@mantine/core/styles.css";
import "@mantine/charts/styles.css";
import "@mantine/dropzone/styles.css";
import "@mantine/tiptap/styles.css";
import "@puckeditor/core/puck.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "@fontsource-variable/figtree";
import { NavbarLinks } from "@/config/NavbarLinks/NavbarLinks";
import { AvandarFeature } from "./AvandarFeature";
import { AvandarSidebar } from "./AvandarSidebar";
import { AvandarStageProviders } from "./AvandarStageProviders";
import { AvandarToolbar } from "./AvandarToolbar";
import { useAvandarStageLayout } from "./useAvandarStageLayout";
import "../stage.css";
import type { ExplorerMode } from "../ExplorerScreen/ExplorerTimeline";
import type { ReactNode } from "react";

type Props = {
  feature: keyof typeof names;
  frame: number;
  width?: number;
  height?: number;
  mode?: ExplorerMode;
};

i18n.setMessagesCompiler(compileMessage);
i18n.loadAndActivate({ locale: "en", messages: {} });
ModuleRegistry.registerModules([AllCommunityModule]);
const links = [
  NavbarLinks.workspaceHome("avandar-labs"),
  NavbarLinks.dataImport("avandar-labs"),
  NavbarLinks.dataExplorer("avandar-labs"),
  NavbarLinks.dashboards("avandar-labs"),
  NavbarLinks.map("avandar-labs"),
  NavbarLinks.ontologyDesignerHome("avandar-labs"),
];
const names = {
  import: "Data Sources",
  explorer: "Data Explorer",
  dashboards: "Dashboards",
  cases: "Case Manager",
  map: "Maps",
  ontology: "Case Manager",
  "attribute-mapping": "Case Manager",
};
const routeIndex = {
  import: 1,
  explorer: 2,
  dashboards: 3,
  map: 4,
  cases: 5,
  ontology: 5,
  "attribute-mapping": 5,
};

/**
 * Actual source components and CSS, with frame-controlled fixtures replacing
 * app services.
 */
export function AvandarStage({
  feature,
  frame,
  width = 1600,
  height = 840,
  mode = "full",
}: Readonly<Props>): ReactNode {
  const contentWidth = width - 240;
  const contentHeight = height - 82;
  useAvandarStageLayout({ frame });

  return (
    <AvandarStageProviders route={links[routeIndex[feature]]!.link.to}>
      <div className="avandarFilm" style={{ width, height }}>
        <AvandarSidebar links={links} />
        <div className={`${slateCss.slate} videoSlate`}>
          <AvandarToolbar
            title={
              feature === "cases" && frame >= 258
                ? "Video - Harborfield response case - pilot"
                : names[feature]
            }
          />
          <div
            className="videoAppContent"
            style={{ width: contentWidth, height: contentHeight }}
          >
            <AvandarFeature
              feature={feature}
              frame={frame}
              width={contentWidth}
              height={contentHeight}
              mode={mode}
            />
          </div>
        </div>
        <div className="videoProvenance">
          Fictional demonstration data · Programmatic render of Avandar
          components
        </div>
      </div>
    </AvandarStageProviders>
  );
}
