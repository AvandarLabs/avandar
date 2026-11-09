import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { buildChatContextPageRefs } from "@/components/ChatPanel/ChatThread/ChatContextTray/useChatContextPageRefs";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import type { DashboardEditorAppState } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";

const DASHBOARD_ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const OTHER_DASHBOARD_ID = "aaaaaaaa-9999-4999-8999-aaaaaaaaaaaa";
const DATASET_ID = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";
const CASE_TYPE_ID = "cccccccc-3333-4333-8333-cccccccccccc";
const CASE_ID = "dddddddd-4444-4444-8444-dddddddddddd";
const MAP_ID = "eeeeeeee-5555-4555-8555-eeeeeeeeeeee";

type EditorState = Pick<
  DashboardEditorAppState,
  "activeDashboardId" | "editorData"
>;

const NO_EDITOR: EditorState = {
  activeDashboardId: undefined,
  editorData: undefined,
};

function _buildDataVizBlock(id: string, prompt: string | undefined) {
  return {
    type: "DataViz",
    props: { id, vizType: "line", nlQuery: prompt ? { prompt } : {} },
  };
}

function _buildEditorState(blocks: readonly unknown[]): EditorState {
  return {
    activeDashboardId: DASHBOARD_ID,
    editorData: {
      root: { props: { title: "Measles" } },
      content: blocks,
    } as never,
  };
}

function _build(
  pathname: string,
  options: {
    chatPageContext?: ChatPageContext.T;
    dashboardEditorState?: EditorState;
  } = {},
) {
  return buildChatContextPageRefs({
    pathname,
    chatPageContext:
      options.chatPageContext ??
      Model.make("ChatPageContext", { app: "other" }),
    dashboardEditorState: options.dashboardEditorState ?? NO_EDITOR,
  });
}

function _tileRef(subId: string) {
  return { gadgetType: "dashboard_tile", gadgetId: DASHBOARD_ID, subId };
}

describe("buildChatContextPageRefs", () => {
  it("lists the open dashboard, then its charts with a prompt, up to 12", () => {
    const blocks = Array.from({ length: 14 }, (_, index) => {
      return _buildDataVizBlock(`b${index + 1}`, `Chart ${index + 1}`);
    });

    const refs = _build(`/ws/dashboards/edit/${DASHBOARD_ID}`, {
      dashboardEditorState: _buildEditorState(blocks),
    });

    expect(refs).toEqual([
      { gadgetType: "dashboard", gadgetId: DASHBOARD_ID, subId: null },
      ...Array.from({ length: 12 }, (_, index) => {
        return _tileRef(`b${index + 1}`);
      }),
    ]);
  });

  it("leaves out charts without a prompt", () => {
    const refs = _build(`/ws/dashboards/preview/${DASHBOARD_ID}`, {
      dashboardEditorState: _buildEditorState([
        _buildDataVizBlock("b1", "Weekly cases"),
        _buildDataVizBlock("b2", undefined),
        _buildDataVizBlock("b3", "   "),
      ]),
    });

    expect(refs).toEqual([
      { gadgetType: "dashboard", gadgetId: DASHBOARD_ID, subId: null },
      _tileRef("b1"),
    ]);
  });

  it("lists no charts when the editor holds another dashboard", () => {
    const refs = _build(`/ws/dashboards/edit/${OTHER_DASHBOARD_ID}`, {
      dashboardEditorState: _buildEditorState([
        _buildDataVizBlock("b1", "Weekly cases"),
      ]),
    });

    expect(refs).toEqual([
      { gadgetType: "dashboard", gadgetId: OTHER_DASHBOARD_ID, subId: null },
    ]);
  });

  it("lists the open dataset in the Data Explorer and on its page", () => {
    const explorerRefs = _build("/ws/data-explorer", {
      chatPageContext: Model.make("ChatPageContext", {
        app: "data-explorer",
        openDatasetId: DATASET_ID,
      }),
    });
    const datasetPageRefs = _build(`/ws/data-manager/${DATASET_ID}`);

    const datasetRef = {
      gadgetType: "dataset",
      gadgetId: DATASET_ID,
      subId: null,
    };
    expect(explorerRefs).toEqual([datasetRef]);
    expect(datasetPageRefs).toEqual([datasetRef]);
  });

  it("lists nothing in the Data Explorer without an open dataset", () => {
    expect(_build("/ws/data-explorer")).toEqual([]);
  });

  it("lists the open map and case type", () => {
    expect(_build(`/ws/map/${MAP_ID}`)).toEqual([
      { gadgetType: "map", gadgetId: MAP_ID, subId: null },
    ]);
    expect(_build(`/ws/individual-manager/${CASE_TYPE_ID}`)).toEqual([
      { gadgetType: "concept", gadgetId: CASE_TYPE_ID, subId: null },
    ]);
  });

  it("lists a case's case type, never the case", () => {
    const refs = _build(`/ws/individual-manager/${CASE_TYPE_ID}/${CASE_ID}`);

    expect(refs).toEqual([
      { gadgetType: "concept", gadgetId: CASE_TYPE_ID, subId: null },
    ]);
  });

  it("lists nothing on a published dashboard opened by slug", () => {
    expect(_build("/ws/d/my-slug")).toEqual([]);
  });

  it("lists nothing on pages without a gadget", () => {
    expect(_build("/ws/dashboards")).toEqual([]);
    expect(_build("/ws/ontology-designer")).toEqual([]);
    expect(_build("/ws/settings")).toEqual([]);
  });
});
