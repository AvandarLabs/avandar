import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GadgetActionsMenu } from "@/components/RichText/Gadget/GadgetActionsMenu/GadgetActionsMenu";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { Editor } from "@tiptap/core";

const mocks = vi.hoisted(() => {
  return {
    useDashboardSummary: vi.fn(),
    navigate: vi.fn(),
    buildLocation: vi.fn(),
  };
});

vi.mock(
  "@/components/RichText/Gadget/useGadgetSummaries/useGadgetSummaries",
  () => {
    const unavailable = () => {
      return { status: "unavailable" };
    };
    return {
      useDashboardSummary: mocks.useDashboardSummary,
      useDashboardTileSummary: unavailable,
      useDatasetSummary: unavailable,
      useMapSummary: unavailable,
      useConceptSummary: unavailable,
      useIndividualSummary: unavailable,
    };
  },
);

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => {
      return mocks.navigate;
    },
    useRouter: () => {
      return { buildLocation: mocks.buildLocation };
    },
  };
});

const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111";
const NODE_POSITION = 12;

const DASHBOARD_REF: Gadget.Ref = {
  gadgetType: "dashboard",
  gadgetId: DASHBOARD_ID,
  subId: null,
};

const DASHBOARD_LINK = {
  to: "/$workspaceSlug/dashboards/preview/$dashboardId",
  params: { workspaceSlug: "nyc-doh", dashboardId: DASHBOARD_ID },
};

/** Just enough of an editor for the menu: its mode and display switch. */
function _createEditor(isEditable: boolean) {
  const commands = {
    showGadgetAsEmbed: vi.fn(),
    showGadgetAsLink: vi.fn(),
  };
  return {
    commands,
    editor: { isEditable, commands } as unknown as Editor,
  };
}

function _getPos(): number {
  return NODE_POSITION;
}

/** Opens an embed's actions menu and finds an item by its label. */
async function _findEmbedMenuItem(label: string): Promise<HTMLElement> {
  fireEvent.click(screen.getByRole("button", { name: "More actions" }));
  return screen.findByRole("menuitem", { name: label, hidden: true });
}

beforeEach(() => {
  mocks.useDashboardSummary.mockReset();
  mocks.navigate.mockReset();
  mocks.buildLocation.mockReset();
  mocks.useDashboardSummary.mockReturnValue({
    status: "available",
    name: "Measles by borough",
    facts: [],
    link: DASHBOARD_LINK,
  });
});

afterEach(() => {
  Reflect.deleteProperty(navigator, "clipboard");
});

describe("GadgetActionsMenu on an embed", () => {
  it("switches the embed to a link at the node's position", async () => {
    const { editor, commands } = _createEditor(true);
    render(
      <GadgetActionsMenu
        gadgetRef={DASHBOARD_REF}
        display="embed"
        editor={editor}
        getPos={_getPos}
      />,
    );
    fireEvent.click(await _findEmbedMenuItem("Show as link"));
    expect(commands.showGadgetAsLink).toHaveBeenCalledWith(NODE_POSITION);
  });

  it("navigates to an available gadget's link from its open action", async () => {
    const { editor } = _createEditor(true);
    render(
      <GadgetActionsMenu
        gadgetRef={DASHBOARD_REF}
        display="embed"
        editor={editor}
        getPos={_getPos}
      />,
    );
    fireEvent.click(await _findEmbedMenuItem("Open dashboard"));
    expect(mocks.navigate).toHaveBeenCalledWith(DASHBOARD_LINK);
  });

  it("copies the gadget's absolute address", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    // jsdom has no clipboard.
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    mocks.buildLocation.mockReturnValue({
      href: `/nyc-doh/dashboards/preview/${DASHBOARD_ID}`,
    });
    const { editor } = _createEditor(true);
    render(
      <GadgetActionsMenu
        gadgetRef={DASHBOARD_REF}
        display="embed"
        editor={editor}
        getPos={_getPos}
      />,
    );
    fireEvent.click(await _findEmbedMenuItem("Copy link"));
    expect(mocks.buildLocation).toHaveBeenCalledWith(DASHBOARD_LINK);
    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/nyc-doh/dashboards/preview/${DASHBOARD_ID}`,
    );
    expect(await screen.findByText("Link copied")).toBeInTheDocument();
  });

  it("offers only the display switch for a gadget the reader cannot open", async () => {
    mocks.useDashboardSummary.mockReturnValue({ status: "unavailable" });
    const { editor } = _createEditor(true);
    render(
      <GadgetActionsMenu
        gadgetRef={DASHBOARD_REF}
        display="embed"
        editor={editor}
        getPos={_getPos}
      />,
    );
    await _findEmbedMenuItem("Show as link");
    expect(
      screen.getAllByRole("menuitem", { hidden: true }).map((item) => {
        return item.textContent;
      }),
    ).toEqual(["Show as link"]);
  });

  it("renders no menu when the editor is read-only", () => {
    const { editor } = _createEditor(false);
    render(
      <GadgetActionsMenu
        gadgetRef={DASHBOARD_REF}
        display="embed"
        editor={editor}
        getPos={_getPos}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "More actions" }),
    ).not.toBeInTheDocument();
  });
});

describe("GadgetActionsMenu on a link", () => {
  function _renderLink(isEditable: boolean) {
    const created = _createEditor(isEditable);
    render(
      <GadgetActionsMenu
        gadgetRef={DASHBOARD_REF}
        display="link"
        editor={created.editor}
        getPos={_getPos}
      >
        <a href="/dashboard">Measles by borough</a>
      </GadgetActionsMenu>,
    );
    return created;
  }

  it("switches the link to an embed from the actions shown on focus", async () => {
    const { commands } = _renderLink(true);
    fireEvent.focus(screen.getByRole("link", { name: "Measles by borough" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Show as embed" }),
    );
    expect(commands.showGadgetAsEmbed).toHaveBeenCalledWith(NODE_POSITION);
  });

  it("shows the link's actions after the pointer rests on the chip", async () => {
    _renderLink(true);
    fireEvent.mouseEnter(
      screen.getByRole("link", { name: "Measles by borough" }),
    );
    expect(
      screen.queryByRole("button", { name: "Show as embed" }),
    ).not.toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Show as embed" }),
      ).toBeInTheDocument();
    });
  });

  it("shows only the chip when the editor is read-only", () => {
    _renderLink(false);
    fireEvent.focus(screen.getByRole("link", { name: "Measles by borough" }));
    expect(
      screen.getByRole("link", { name: "Measles by borough" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Show as embed" }),
    ).not.toBeInTheDocument();
  });
});
