import { CURRENT_SCHEMA_VERSION } from "../../../../src/views/DashboardApp/DashboardEditorView/migrations/constants.ts";

// TODO(jpsyx): refactor this mess of slop
export function createInitialDashboardPuckData(options: {
  dashboardTitle: string;
  // TODO(jpsyx): remove `any` usage here. It should return AvaPageData
  // somehow but still remain in `shared` directory.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): any {
  return {
    root: {
      props: {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        author: "",
        containerMaxWidth: { unit: "%", value: 100 },
        horizontalPadding: "md",
        isAuthorHidden: false,
        isPublishedAtHidden: false,
        isSubtitleHidden: false,
        isTitleHidden: false,
        publishedAt: "",
        subtitle: "",
        title: options.dashboardTitle,
        verticalPadding: "lg",
      },
    },
    content: [],
  };
}

export const DashboardConfigs = {
  // TODO(jpsyx): remove `any` usage here. It should return AvaPageData
  // somehow but still remain in `shared` directory.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  makeEmpty: (): any => {
    return createInitialDashboardPuckData({
      dashboardTitle: "Untitled dashboard",
    });
    // TODO(jpsyx): change DashboardConfig to be a Puck config
    /*
    return Models.make("DashboardConfig", {
      id: crypto.randomUUID() as DashboardConfigId,
      version: 1,
      queries: {},
      widgets: {},
    });
    */
  },
};
