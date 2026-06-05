import "@/config/Theme/animationPresets.css";
import { Button } from "@mantine/core";
import { act, fireEvent, screen, waitFor, render  } from "@/test-utils";
import { useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FloatingPanel } from "@/components/FloatingPanel/FloatingPanel";
import { ANIMATION_PRESET } from "@/config/Theme";

function enableAnimationsForTest(): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => {
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    }),
  );
}

type HarnessProps = {
  onRequestClose: () => void;
};

function SettingsPanelHarness({ onRequestClose }: HarnessProps): JSX.Element {
  const [opened, setOpened] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <Button
        ref={settingsButtonRef}
        onClick={() => {
          return setOpened(true);
        }}
      >
        Settings
      </Button>
      <FloatingPanel
        title="Visualization Settings"
        opened={opened}
        collapsed={false}
        openOriginRef={settingsButtonRef}
        initialPosition={{ top: 120, left: 80 }}
        onClose={() => {
          setOpened(false);
        }}
        onRequestClose={onRequestClose}
        onToggleCollapse={() => {}}
      >
        <input aria-label="Viz field" />
      </FloatingPanel>
    </>
  );
}

describe("FloatingPanel Escape dismiss", () => {
  beforeEach(() => {
    enableAnimationsForTest();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls onRequestClose when Escape is pressed right after opening via the toolbar button", async () => {
    const onRequestClose = vi.fn();
    render(<SettingsPanelHarness onRequestClose={onRequestClose} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    });

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    });

    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onRequestClose when Escape is pressed while a nested input is focused", async () => {
    const onRequestClose = vi.fn();
    render(<SettingsPanelHarness onRequestClose={onRequestClose} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    });

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const field = screen.getByRole("textbox", { name: "Viz field" });
    await act(async () => {
      field.focus();
      fireEvent.keyDown(field, { key: "Escape", code: "Escape" });
    });

    expect(onRequestClose).not.toHaveBeenCalled();
  });

  it("runs ooze-in preset when motion is enabled", async () => {
    render(<SettingsPanelHarness onRequestClose={vi.fn()} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    });

    await waitFor(() => {
      const dialog = screen.getByRole("dialog");
      expect(dialog.classList.contains(ANIMATION_PRESET.oozeIn.className)).toBe(
        true,
      );
    });
  });
});
