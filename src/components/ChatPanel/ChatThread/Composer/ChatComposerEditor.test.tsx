import { AssistantRuntimeProvider, useLocalRuntime } from "@assistant-ui/react";
import { useRef } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import { act, fireEvent, render, screen, waitFor } from "@/test-utils";
import { ChatComposerEditor } from "./ChatComposerEditor";
import type { GadgetSearchResult } from "@/clients/gadgets/searchGadgets/searchGadgets";
import type {
  ChatModelAdapter,
  ChatModelRunOptions,
} from "@assistant-ui/react";
import type { Editor, JSONContent } from "@tiptap/core";
import type { MutableRefObject, ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return { searchGadgets: vi.fn(), run: vi.fn() };
});

vi.mock("@/clients/gadgets/searchGadgets/searchGadgets", () => {
  return { searchGadgets: mocks.searchGadgets };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "33333333-3333-4333-8333-333333333333" };
    },
  };
});

vi.mock(
  "@/components/RichText/Gadget/useGadgetSummaries/useGadgetSummaries",
  () => {
    const unavailable = () => {
      return { status: "unavailable" };
    };
    return {
      useDashboardSummary: unavailable,
      useDashboardTileSummary: unavailable,
      useDatasetSummary: () => {
        return {
          status: "available",
          name: "US deaths",
          facts: [],
          link: { to: "/" },
        };
      },
      useMapSummary: unavailable,
      useConceptSummary: unavailable,
      useIndividualSummary: unavailable,
    };
  },
);

// jsdom implements none of the geometry ProseMirror measures after a focus.
beforeAll(() => {
  const emptyRects = (): DOMRectList => {
    const noRect = (): null => {
      return null;
    };
    return Object.assign([], { item: noRect }) as unknown as DOMRectList;
  };
  Range.prototype.getClientRects ??= emptyRects;
  Range.prototype.getBoundingClientRect ??= () => {
    return new DOMRect(0, 0, 0, 0);
  };
  Element.prototype.getClientRects ??= emptyRects;
});

function _buildDatasetRef(index: number) {
  return {
    gadgetType: "dataset",
    gadgetId: `22222222-2222-4222-8222-22222222222${index}`,
    subId: null,
  } as const;
}

const DATASET_REF = _buildDatasetRef(0);

const DATASET_RESULT: GadgetSearchResult = {
  ref: DATASET_REF,
  label: "US deaths",
  subLabel: undefined,
  hasLimitedAudience: false,
};

const DATA_PLACEHOLDER = "Ask about your data...";

type HarnessProps = {
  placeholder?: string;
  disabled?: boolean;
  inputRef?: MutableRefObject<HTMLElement | null>;
};

const ADAPTER: ChatModelAdapter = {
  run: (options: ChatModelRunOptions) => {
    return mocks.run(options);
  },
};

function Harness(props: HarnessProps): ReactNode {
  const runtime = useLocalRuntime(ADAPTER);
  const fallbackRef = useRef<HTMLElement | null>(null);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ChatComposerEditor
        placeholder={props.placeholder ?? DATA_PLACEHOLDER}
        disabled={props.disabled ?? false}
        inputRef={props.inputRef ?? fallbackRef}
        actions={<span>Offline mode</span>}
      />
    </AssistantRuntimeProvider>
  );
}

/** The editing area, which is a combobox while the `@` menu is open. */
function _getEditingArea(): HTMLElement {
  return (
    screen.queryByRole("textbox", { name: "Message" }) ??
    screen.getByRole("combobox", { name: "Message" })
  );
}

function _getEditor(): Editor {
  const { editor } = _getEditingArea() as HTMLElement & { editor?: Editor };
  if (!editor) {
    throw new Error("the editor is not mounted");
  }
  return editor;
}

function _type(text: string): void {
  act(() => {
    _getEditor().commands.insertContent(text);
  });
  // The insert command collapses the DOM selection, and jsdom throws on
  // that when no range exists, unlike a real browser.
  window.getSelection()?.selectAllChildren(_getEditingArea());
}

function _setParagraph(content: JSONContent[]): void {
  act(() => {
    _getEditor().commands.setContent({
      type: "doc",
      content: [{ type: "paragraph", content }],
    });
  });
  window.getSelection()?.selectAllChildren(_getEditingArea());
}

function _pressEnter(options: { shiftKey?: boolean } = {}): void {
  act(() => {
    fireEvent.keyDown(_getEditingArea(), { key: "Enter", ...options });
  });
}

/** The text of the last user message each run received. */
function _getSentTexts(): string[] {
  return mocks.run.mock.calls.map(([options]) => {
    const { messages } = options as ChatModelRunOptions;
    const lastMessage = messages.at(-1);
    return (lastMessage?.content ?? [])
      .map((part) => {
        return part.type === "text" ? part.text : "";
      })
      .join("");
  });
}

/** Lets the runtime start any run a send queued. */
async function _flushRuntime(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
}

beforeEach(() => {
  mocks.searchGadgets.mockReset();
  mocks.run.mockReset();
  mocks.run.mockResolvedValue({ content: [{ type: "text", text: "Done" }] });
});

describe("ChatComposerEditor", () => {
  it("names the editing area for assistive technology", () => {
    render(<Harness />);

    const area = _getEditingArea();

    expect(area).toHaveAttribute("aria-multiline", "true");
    expect(area).toHaveAttribute("contenteditable", "true");
  });

  it("sends on Enter and clears", async () => {
    render(<Harness />);

    _type("hello");
    _pressEnter();

    await waitFor(() => {
      expect(_getSentTexts()).toEqual(["hello"]);
    });
    expect(_getEditor().isEmpty).toBe(true);
  });

  it("sends from the send button", async () => {
    render(<Harness />);

    _type("hello");
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(_getSentTexts()).toEqual(["hello"]);
    });
    expect(_getEditor().isEmpty).toBe(true);
  });

  it("adds a line on Shift+Enter without sending", async () => {
    render(<Harness />);

    _type("one");
    _pressEnter({ shiftKey: true });
    await _flushRuntime();

    expect(mocks.run).not.toHaveBeenCalled();
    expect(JSON.stringify(_getEditor().getJSON())).toContain("hardBreak");
  });

  it("keeps a line break in the sent text", async () => {
    render(<Harness />);

    _setParagraph([
      { type: "text", text: "one" },
      { type: "hardBreak" },
      { type: "text", text: "two" },
    ]);
    _pressEnter();

    await waitFor(() => {
      expect(_getSentTexts()).toEqual(["one\ntwo"]);
    });
  });

  it("picks the highlighted row on Enter while the menu is open", async () => {
    mocks.searchGadgets.mockResolvedValue([DATASET_RESULT]);
    render(<Harness />);

    _type("@us");
    expect(
      await screen.findByRole("option", { name: /US deaths/ }),
    ).toBeInTheDocument();
    _pressEnter();

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).toBeNull();
    });
    await _flushRuntime();
    expect(mocks.run).not.toHaveBeenCalled();
    expect(JSON.stringify(_getEditor().getJSON())).toContain("gadgetLink");
  });

  it("does not send while the menu is open with nothing to pick", async () => {
    mocks.searchGadgets.mockResolvedValue([]);
    render(<Harness />);

    _type("@zz");
    await waitFor(() => {
      expect(mocks.searchGadgets).toHaveBeenCalled();
    });
    _pressEnter();
    await _flushRuntime();

    expect(mocks.run).not.toHaveBeenCalled();
    expect(_getEditor().getJSON()).toEqual({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "@zz" }] },
      ],
    });
  });

  it("does not send while a turn runs", async () => {
    mocks.run.mockImplementation(({ abortSignal }: ChatModelRunOptions) => {
      return new Promise((resolve) => {
        abortSignal.addEventListener("abort", () => {
          resolve({ content: [] });
        });
      });
    });
    render(<Harness />);
    _type("first");
    _pressEnter();
    await waitFor(() => {
      expect(mocks.run).toHaveBeenCalledTimes(1);
    });

    _type("second");
    _pressEnter();
    await _flushRuntime();

    expect(mocks.run).toHaveBeenCalledTimes(1);
    expect(_getEditor().getText()).toBe("second");
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
  });

  it("does not send while disabled", async () => {
    render(<Harness disabled />);

    _type("hello");
    _pressEnter();
    await _flushRuntime();

    expect(mocks.run).not.toHaveBeenCalled();
    expect(_getEditingArea()).toHaveAttribute("contenteditable", "false");
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
  });

  it("does not send an empty or blank message", async () => {
    render(<Harness />);

    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
    _pressEnter();
    _type("   ");
    _pressEnter();
    await _flushRuntime();

    expect(mocks.run).not.toHaveBeenCalled();
  });

  it("sends a chip as its token", async () => {
    render(<Harness />);

    _setParagraph([
      { type: "text", text: "Show " },
      { type: "gadgetLink", attrs: DATASET_REF },
      { type: "text", text: " by week" },
    ]);
    expect(
      await screen.findByRole("button", { name: "US deaths" }),
    ).toBeInTheDocument();
    _pressEnter();

    await waitFor(() => {
      expect(_getSentTexts()).toEqual([
        `Show ${ChatMentionToken.buildToken(DATASET_REF)} by week`,
      ]);
    });
  });

  it("notes when more than five gadgets are mentioned", () => {
    const note = "Only the first 5 mentions are described to the assistant.";
    render(<Harness />);

    _setParagraph(
      [0, 1, 2, 3, 4].map((index) => {
        return { type: "gadgetLink", attrs: _buildDatasetRef(index) };
      }),
    );
    expect(screen.queryByText(note)).toBeNull();

    _setParagraph(
      [0, 1, 2, 3, 4, 5].map((index) => {
        return { type: "gadgetLink", attrs: _buildDatasetRef(index) };
      }),
    );
    expect(screen.getByText(note)).toBeInTheDocument();
  });

  it("follows a new placeholder", () => {
    const { rerender } = render(<Harness placeholder={DATA_PLACEHOLDER} />);
    const readPlaceholder = () => {
      return _getEditingArea()
        .querySelector("[data-placeholder]")
        ?.getAttribute("data-placeholder");
    };
    expect(readPlaceholder()).toBe(DATA_PLACEHOLDER);

    rerender(<Harness placeholder="Ask me to add a chart" />);

    expect(readPlaceholder()).toBe("Ask me to add a chart");
  });

  it("hands the editing area to the input ref and shows the actions", () => {
    const inputRef: MutableRefObject<HTMLElement | null> = { current: null };
    render(<Harness inputRef={inputRef} />);

    expect(inputRef.current).toBe(_getEditingArea());
    expect(screen.getByText("Offline mode")).toBeInTheDocument();
  });
  it("pastes a chip of a type the chat does not offer as its text", () => {
    render(<Harness />);
    const caseId = "55555555-5555-4555-8555-555555555555";

    act(() => {
      _getEditor().commands.setContent(
        `<p>See <a data-type="gadgetLink" data-gadget-type="individual" ` +
          `data-gadget-id="${caseId}" href="/cases">Case of Amara</a></p>`,
      );
    });

    const json = JSON.stringify(_getEditor().getJSON());
    expect(json).not.toContain("gadgetLink");
    expect(_getEditor().getText()).toBe("See Case of Amara");
  });

  it("pastes a tile chip whose block id cannot be a token as its text", () => {
    render(<Harness />);
    const dashboardId = "66666666-6666-4666-8666-666666666666";

    act(() => {
      _getEditor().commands.setContent(
        `<p>See <a data-type="gadgetLink" data-gadget-type="dashboard_tile" ` +
          `data-gadget-id="${dashboardId}" data-sub-id="block 1" ` +
          `href="/d">Visits</a></p>`,
      );
    });

    expect(JSON.stringify(_getEditor().getJSON())).not.toContain("gadgetLink");
    expect(_getEditor().getText()).toBe("See Visits");
  });

  it("pastes a chip of a chat type as a chip", () => {
    render(<Harness />);

    act(() => {
      _getEditor().commands.setContent(
        `<p>See <a data-type="gadgetLink" data-gadget-type="dataset" ` +
          `data-gadget-id="${DATASET_REF.gadgetId}" href="/d">US deaths</a></p>`,
      );
    });

    expect(JSON.stringify(_getEditor().getJSON())).toContain("gadgetLink");
  });

  it("marks the editing area disabled while input is off", () => {
    const { rerender } = render(<Harness />);
    expect(_getEditingArea()).toHaveAttribute("aria-disabled", "false");

    rerender(<Harness disabled />);

    expect(_getEditingArea()).toHaveAttribute("aria-disabled", "true");
  });
});
