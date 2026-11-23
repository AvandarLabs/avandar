import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GadgetActionsMenu } from "@/components/RichText/Gadget/GadgetActionsMenu/GadgetActionsMenu";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { Editor } from "@tiptap/core";

const mocks = vi.hoisted(() => {
  return { useDashboardSummary: vi.fn(), buildLocation: vi.fn() };
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
    useRouter: () => {
      return { buildLocation: mocks.buildLocation };
    },
  };
});

const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111";
const DASHBOARD_HREF = `/nyc-doh/dashboards/preview/${DASHBOARD_ID}`;
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

/**
 * Just enough of an editor for the menu: its mode and a command chain that
 * records which display switch ran, at which position, after focusing.
 */
function _createEditor({ isEditable = true } = {}) {
  const calls: string[] = [];
  const chain = {
    focus: () => {
      calls.push("focus");
      return chain;
    },
    showGadgetAsEmbed: (position: number) => {
      calls.push(`showGadgetAsEmbed(${position})`);
      return chain;
    },
    showGadgetAsLink: (position: number) => {
      calls.push(`showGadgetAsLink(${position})`);
      return chain;
    },
    run: () => {
      calls.push("run");
      return true;
    },
  };
  const editor = {
    isEditable,
    chain: () => {
      return chain;
    },
  };
  return { calls, editor };
}

type FakeEditor = ReturnType<typeof _createEditor>["editor"];

function _getPos(): number {
  return NODE_POSITION;
}

function _renderMenu(
  display: "link" | "embed",
  editor: FakeEditor,
  getPos: () => number | undefined = _getPos,
): void {
  render(
    <GadgetActionsMenu
      gadgetRef={DASHBOARD_REF}
      display={display}
      editor={editor as unknown as Editor}
      getPos={getPos}
    />,
  );
}

/** Opens an embed's actions menu and finds an item by its label. */
async function _findEmbedMenuItem(label: string): Promise<HTMLElement> {
  fireEvent.click(screen.getByRole("button", { name: "More actions" }));
  return screen.findByRole("menuitem", { name: label, hidden: true });
}

beforeEach(() => {
  mocks.useDashboardSummary.mockReset();
  mocks.buildLocation.mockReset();
  mocks.buildLocation.mockReturnValue({ href: DASHBOARD_HREF });
  mocks.useDashboardSummary.mockReturnValue({
    status: "available",
    name: "Measles by borough",
    facts: [],
    link: DASHBOARD_LINK,
  });
});

afterEach(() => {
  Reflect.deleteProperty(navigator, "clipboard");
  vi.restoreAllMocks();
});

describe("GadgetActionsMenu on an embed", () => {
  it("focuses the editor, then switches the embed to a link at its position", async () => {
    const { editor, calls } = _createEditor();
    _renderMenu("embed", editor);
    fireEvent.click(await _findEmbedMenuItem("Show as link"));
    expect(calls).toEqual([
      "focus",
      `showGadgetAsLink(${NODE_POSITION})`,
      "run",
    ]);
  });

  it("opens the gadget in a new tab so the draft is kept", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const { editor } = _createEditor();
    _renderMenu("embed", editor);
    fireEvent.click(await _findEmbedMenuItem("Open dashboard"));
    expect(mocks.buildLocation).toHaveBeenCalledWith(DASHBOARD_LINK);
    expect(open).toHaveBeenCalledWith(DASHBOARD_HREF, "_blank", "noopener");
  });

  it("copies the gadget's absolute address", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    // jsdom has no clipboard.
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    const { editor } = _createEditor();
    _renderMenu("embed", editor);
    fireEvent.click(await _findEmbedMenuItem("Copy link"));
    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}${DASHBOARD_HREF}`,
    );
    expect(await screen.findByText("Link copied")).toBeInTheDocument();
  });

  it("reports a failed copy when the browser has no clipboard", async () => {
    const { editor } = _createEditor();
    _renderMenu("embed", editor);
    fireEvent.click(await _findEmbedMenuItem("Copy link"));
    expect(
      await screen.findByText("The link could not be copied."),
    ).toBeInTheDocument();
  });

  it("offers only the display switch for a gadget the reader cannot open", async () => {
    mocks.useDashboardSummary.mockReturnValue({ status: "unavailable" });
    const { editor } = _createEditor();
    _renderMenu("embed", editor);
    await _findEmbedMenuItem("Show as link");
    expect(
      screen.getAllByRole("menuitem", { hidden: true }).map((item) => {
        return item.textContent;
      }),
    ).toEqual(["Show as link"]);
  });

  it("does nothing when the node has no position", async () => {
    const { editor, calls } = _createEditor();
    _renderMenu("embed", editor, () => {
      return undefined;
    });
    fireEvent.click(await _findEmbedMenuItem("Show as link"));
    expect(calls).toEqual([]);
  });

  it("does nothing once the editor has turned read-only", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const { editor, calls } = _createEditor();
    _renderMenu("embed", editor);
    const openItem = await _findEmbedMenuItem("Open dashboard");
    editor.isEditable = false;
    fireEvent.click(openItem);
    fireEvent.click(await _findEmbedMenuItem("Show as link"));
    expect(open).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
  });

  it("renders no menu when the editor is read-only", () => {
    const { editor } = _createEditor({ isEditable: false });
    _renderMenu("embed", editor);
    expect(
      screen.queryByRole("button", { name: "More actions" }),
    ).not.toBeInTheDocument();
  });
});

describe("GadgetActionsMenu on a link", () => {
  function _getChip(): HTMLElement {
    return screen.getByRole("button", { name: "Measles by borough" });
  }

  it("switches the link to an embed from the menu the chip opens", async () => {
    const { editor, calls } = _createEditor();
    _renderMenu("link", editor);
    fireEvent.click(_getChip());
    fireEvent.click(
      await screen.findByRole("menuitem", {
        name: "Show as embed",
        hidden: true,
      }),
    );
    expect(calls).toEqual([
      "focus",
      `showGadgetAsEmbed(${NODE_POSITION})`,
      "run",
    ]);
  });

  it("opens the menu after the pointer rests on the chip and closes it after the pointer leaves", async () => {
    const { editor } = _createEditor();
    _renderMenu("link", editor);
    fireEvent.mouseEnter(_getChip());
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    fireEvent.mouseLeave(_getChip());
    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  it("keeps focus on the chip while the pointer opens the menu", async () => {
    const { editor } = _createEditor();
    _renderMenu("link", editor);
    _getChip().focus();
    fireEvent.mouseEnter(_getChip());
    await screen.findByRole("menu");
    expect(_getChip()).toHaveFocus();
  });

  it("returns focus to the chip when Escape closes the menu", async () => {
    const { editor } = _createEditor();
    _renderMenu("link", editor);
    _getChip().focus();
    fireEvent.click(_getChip());
    const menu = await screen.findByRole("menu");
    fireEvent.keyDown(menu, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(_getChip()).toHaveFocus();
    });
  });

  it("shows only an unlinked chip when the editor is read-only", () => {
    const { editor } = _createEditor({ isEditable: false });
    _renderMenu("link", editor);
    expect(_getChip()).not.toHaveAttribute("aria-haspopup");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
