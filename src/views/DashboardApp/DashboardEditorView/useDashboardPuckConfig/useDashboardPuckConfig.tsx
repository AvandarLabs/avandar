import { msg } from "@lingui/core/macro";
import { useMemo } from "react";
import { useDataVizPBlockConfig } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/useDataVizPBlockConfig";
import { useFilterPBlockConfig } from "@/views/DashboardApp/AvaPage/pblocks/FilterPBlock/useFilterPBlockConfig";
import { useMapPBlockConfig } from "@/views/DashboardApp/AvaPage/pblocks/MapPBlock/useMapPBlockConfig";
import { useContainerMaxWidthPFieldConfig } from "@/views/DashboardApp/AvaPage/pfields/ContainerMaxWidthPField/useContainerMaxWidthPFieldConfig";
import { DashboardDesignTokens } from "@/views/DashboardApp/AvaPage/utils/DashboardDesignTokens/DashboardDesignTokens";
import { createCalloutBlockConfig } from "./createCalloutBlockConfig";
import { createCardConfig } from "./createCardConfig";
import { createCodeBlockConfig } from "./createCodeBlockConfig";
import { createColumnsConfig } from "./createColumnsConfig";
import { createDashboardRootConfig } from "./createDashboardRootConfig";
import { createDividerBlockConfig } from "./createDividerBlockConfig";
import { createEmbedBlockConfig } from "./createEmbedBlockConfig";
import { createFigureBlockConfig } from "./createFigureBlockConfig";
import { createGridConfig } from "./createGridConfig";
import { createHeadingBlockConfig } from "./createHeadingBlockConfig";
import { createListBlockConfig } from "./createListBlockConfig";
import { createParagraphBlockConfig } from "./createParagraphBlockConfig";
import { createQuoteBlockConfig } from "./createQuoteBlockConfig";
import { createSectionConfig } from "./createSectionConfig";
import { createSidebarLayoutConfig } from "./createSidebarLayoutConfig";
import { createTableBlockConfig } from "./createTableBlockConfig";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { AvaPageConfig } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { I18n } from "@lingui/core";

/**
 * Builds the Puck `AvaPageConfig` for a dashboard. Calls hooks for theme /
 * typography options and pblock/pfield configs, then memoizes the resulting
 * config so the Puck editor doesn't see a fresh reference on every render.
 */
export function useDashboardPuckConfig(options: {
  dashboardTitle: string;
  workspaceId: Workspace.Id | undefined;
  dashboardId: Dashboard.Id;
  i18n: I18n;
}): AvaPageConfig {
  const { dashboardTitle, workspaceId, dashboardId, i18n } = options;
  const themeOptions = DashboardDesignTokens.useThemeOptions();
  const typographyOptions = DashboardDesignTokens.useTypographyOptions();
  const dataVizFieldConfig = useDataVizPBlockConfig({
    dashboardTitle,
    workspaceId,
    dashboardId,
  });
  const filterFieldConfig = useFilterPBlockConfig();
  const mapFieldConfig = useMapPBlockConfig();
  const containerMaxWidthFieldConfig = useContainerMaxWidthPFieldConfig();
  return useMemo<AvaPageConfig>(() => {
    return {
      root: createDashboardRootConfig({
        i18n,
        dashboardTitle,
        themeOptions,
        typographyOptions,
        containerMaxWidthFieldConfig,
      }),

      // dictionary of categories (the left sidebar in the editor) for
      // organizing the draggable pblocks (Puck calls them "components"
      // but we'll use the term "pblocks" to mean "Page Blocks")
      categories: {
        layout: {
          title: i18n._(msg`Layout`),
          defaultExpanded: true,
          components: ["Section", "Columns", "Grid", "SidebarLayout"],
        },
        content: {
          title: i18n._(msg`Content`),
          defaultExpanded: true,
          components: [
            "DataViz",
            "Filter",
            "Map",
            "Card",
            "CalloutBlock",
            "CodeBlock",
            "HeadingBlock",
            "ParagraphBlock",
            "ListBlock",
            "QuoteBlock",
            "TableBlock",
            "DividerBlock",
          ],
        },
        media: {
          title: i18n._(msg`Media`),
          components: ["FigureBlock", "EmbedBlock"],
        },
      },

      components: {
        Section: createSectionConfig({ i18n }),
        Columns: createColumnsConfig({ i18n }),
        SidebarLayout: createSidebarLayoutConfig({ i18n }),
        Grid: createGridConfig({ i18n }),
        Card: createCardConfig({ i18n }),
        DataViz: dataVizFieldConfig,
        Filter: filterFieldConfig,
        Map: mapFieldConfig,
        HeadingBlock: createHeadingBlockConfig({ i18n }),
        ParagraphBlock: createParagraphBlockConfig({ i18n }),
        QuoteBlock: createQuoteBlockConfig({ i18n }),
        DividerBlock: createDividerBlockConfig({ i18n }),
        FigureBlock: createFigureBlockConfig({ i18n }),
        CalloutBlock: createCalloutBlockConfig({ i18n }),
        ListBlock: createListBlockConfig({ i18n }),
        CodeBlock: createCodeBlockConfig({ i18n }),
        EmbedBlock: createEmbedBlockConfig({ i18n }),
        TableBlock: createTableBlockConfig({ i18n }),
      },
    };
  }, [
    dashboardTitle,
    i18n,
    themeOptions,
    typographyOptions,
    dataVizFieldConfig,
    filterFieldConfig,
    mapFieldConfig,
    containerMaxWidthFieldConfig,
  ]);
}

export { getDashboardTitleFromPuckData } from "./DashboardConfigHelpers";
