import "@mantine/core/styles.css";
import "@mantine/charts/styles.css";
import "@mantine/dropzone/styles.css";
import "@mantine/tiptap/styles.css";
import "@puckeditor/core/puck.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "@fontsource-variable/figtree";
import { i18n } from "@lingui/core";
import { compileMessage } from "@lingui/message-utils/compileMessage";
import { I18nProvider } from "@lingui/react";
import {
  MantineProvider,
  Group,
  Text,
  ActionIcon,
  Title,
  Box,
} from "@mantine/core";
import logo from "@product-assets/logoWhite.png";
import {
  IconLayoutSidebarLeftCollapse,
  IconMessageCircle,
  IconChevronDown,
} from "@tabler/icons-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import { useLayoutEffect, useState } from "react";
import { delayRender, continueRender } from "remotion";
import navCss from "@/components/AppShell/Navbar/Navbar.module.css";
import { NavbarLinkItem } from "@/components/AppShell/Navbar/NavbarLinkItem";
import slateCss from "@/components/layouts/AppSlate/AppSlate.module.css";
import { NavbarLinks } from "@/config/NavbarLinks/NavbarLinks";
import { Theme, cssVariablesResolver } from "@/config/Theme/Theme";
import { CasesScreen, CASES_BEATS } from "./CasesScreen/CasesScreen";
import {
  DashboardScreen,
  DASHBOARD_BEATS,
} from "./DashboardScreen/DashboardScreen";
import {
  ExplorerScreen,
  EXPLORER_BEATS,
} from "./ExplorerScreen/ExplorerScreen";
import { ImportScreen, IMPORT_BEATS } from "./ImportScreen/ImportScreen";
import { MapScreen, MAP_BEATS } from "./MapScreen/MapScreen";
import { VideoRouteContext } from "./shims/router";
import "./stage.css";

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
};
const routeIndex = { import: 1, explorer: 2, dashboards: 3, map: 4, cases: 5 };
export const FEATURE_BEATS = {
  import: IMPORT_BEATS,
  explorer: EXPLORER_BEATS,
  dashboards: DASHBOARD_BEATS,
  cases: CASES_BEATS,
  map: MAP_BEATS,
};

/** Actual source components and CSS, with frame-controlled fixtures replacing app services. */
export function AvandarStage({
  feature,
  frame,
  width = 1600,
  height = 840,
  mode = "full",
}: {
  feature: keyof typeof names;
  frame: number;
  width?: number;
  height?: number;
  mode?: string;
}) {
  const contentWidth = width - 240;
  const contentHeight = height - 82;
  const [initialHandle] = useState(() =>
    delayRender("Avandar product fonts and initial layout"),
  );
  useLayoutEffect(
    function delayUntilFontsReady() {
      let alive = true;
      document.fonts.ready.then(() => {
        if (alive) continueRender(initialHandle);
      });
      return () => {
        alive = false;
        continueRender(initialHandle);
      };
    },
    [initialHandle],
  );
  // AG Grid, CodeMirror and ResizeObserver need layout to settle after a seek.
  useLayoutEffect(
    function delayUntilControlledLayoutSettles() {
      const handle = delayRender("Avandar controlled component layout");
      const timer = setTimeout(() => continueRender(handle), 100);
      return () => {
        clearTimeout(timer);
        continueRender(handle);
      };
    },
    [frame],
  );
  return (
    <I18nProvider i18n={i18n}>
      <MantineProvider
        theme={{
          ...Theme,
          fontFamily: "Figtree Variable, Figtree, sans-serif",
        }}
        cssVariablesResolver={cssVariablesResolver}
        forceColorScheme="light"
      >
        <VideoRouteContext.Provider value={links[routeIndex[feature]]!.link.to}>
          <div className="avandarFilm" style={{ width, height }}>
            <aside className="videoNavbar">
              <Group
                className={navCss.navbarLinkPill}
                gap="xs"
                px="xs"
                py="sm"
                wrap="nowrap"
              >
                <img src={logo} width={25} height={25} alt="Avandar Labs" />
                <Text size="sm" fw={500} flex={1}>
                  Avandar Labs
                </Text>
                <IconChevronDown size={18} />
              </Group>
              {links.map((item) => (
                <NavbarLinkItem key={item.link.key} item={item} isOnline />
              ))}
              <Box mt="auto">
                <NavbarLinkItem
                  item={NavbarLinks.workspaceSettings("avandar-labs")}
                  isOnline
                  isUtility
                />
              </Box>
            </aside>
            <div className={`${slateCss.slate} videoSlate`}>
              <Group className="videoToolbar" gap="xs" px="xs" py="xxs">
                <ActionIcon variant="subtle" color="neutral" size="md">
                  <IconLayoutSidebarLeftCollapse size={18} />
                </ActionIcon>
                <Title order={2} size="sm" fw={500}>
                  {feature === "cases" && frame >= 258
                    ? "Video - Harborfield response case - pilot"
                    : names[feature]}
                </Title>
                <Group ml="auto" gap="xs">
                  <ActionIcon variant="subtle" color="neutral">
                    <IconMessageCircle size={18} />
                  </ActionIcon>
                </Group>
              </Group>
              <div
                className="videoAppContent"
                style={{ width: contentWidth, height: contentHeight }}
              >
                {feature === "import" ? (
                  <ImportScreen
                    frame={frame}
                    width={contentWidth}
                    height={contentHeight}
                  />
                ) : null}
                {feature === "explorer" ? (
                  <ExplorerScreen
                    frame={frame}
                    width={contentWidth}
                    height={contentHeight}
                    mode={mode as any}
                  />
                ) : null}
                {feature === "dashboards" ? (
                  <DashboardScreen
                    frame={frame}
                    width={contentWidth}
                    height={contentHeight}
                  />
                ) : null}
                {feature === "cases" ? (
                  <CasesScreen
                    frame={frame}
                    width={contentWidth}
                    height={contentHeight}
                  />
                ) : null}
                {feature === "map" ? (
                  <MapScreen
                    frame={frame}
                    width={contentWidth}
                    height={contentHeight}
                  />
                ) : null}
              </div>
            </div>
            <div className="videoProvenance">
              Fictional demonstration data · Programmatic render of Avandar
              components
            </div>
          </div>
        </VideoRouteContext.Provider>
      </MantineProvider>
    </I18nProvider>
  );
}
