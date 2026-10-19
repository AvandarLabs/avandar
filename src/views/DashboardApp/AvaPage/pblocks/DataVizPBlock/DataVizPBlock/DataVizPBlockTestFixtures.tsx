import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { render } from "@/test-utils";
import { DataVizPBlock } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
import { DashboardFilterStateManager } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig";
import type { PuckContext } from "@puckeditor/core";
import type { ReactElement } from "react";

type RenderBlockOptions = {
  prompt: string;
  rawSql: string;
  vizType: string;
  vizConfig: VizConfig.Legacy;
};

const TEST_DASHBOARD_ID = "00000000-0000-4000-8000-000000000001";

const TEST_WORKSPACE_ID = "00000000-0000-4000-8000-000000000002";

function fakePuckContext(): PuckContext {
  return {
    renderDropZone: () => {
      return null;
    },
    metadata: {
      auth: "workspace",
      workspaceId: TEST_WORKSPACE_ID,
      dashboardId: TEST_DASHBOARD_ID,
    },
    isEditing: true,
    dragRef: null,
  };
}

function renderBlock(props: RenderBlockOptions): ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AvandarAppProvider>
        <DashboardFilterStateManager.Provider>
          <DataVizPBlock
            id="chart"
            bindingVersion={0}
            puck={fakePuckContext()}
            nlQuery={{
              prompt: props.prompt,
              rawSql: props.rawSql,
              generations: [],
            }}
            vizType={
              props.vizType as Parameters<typeof DataVizPBlock>[0]["vizType"]
            }
            vizConfig={props.vizConfig}
            globalFilterSubscription={{ mode: "all", subscribedFilterIds: [] }}
            localFilters={[]}
          />
        </DashboardFilterStateManager.Provider>
      </AvandarAppProvider>
    </QueryClientProvider>,
  ) as unknown as ReactElement;
}

/** Fixtures for the surrounding rendering tests. */
export const DataVizPBlockTestFixtures = {
  TEST_DASHBOARD_ID,
  TEST_WORKSPACE_ID,
  fakePuckContext,
  renderBlock,
};
