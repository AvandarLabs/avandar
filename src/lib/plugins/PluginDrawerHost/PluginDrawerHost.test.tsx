import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { PluginDrawerHost } from "@/lib/plugins/PluginDrawerHost/PluginDrawerHost";
import { PluginDrawerStore } from "@/lib/plugins/PluginDrawerHost/PluginDrawerStore";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@/test-utils";
import type { ReactNode } from "react";

function Counter(): ReactNode {
  const [clickCount, setClickCount] = useState(0);
  return (
    <button
      type="button"
      onClick={() => {
        setClickCount((currentCount) => {
          return currentCount + 1;
        });
      }}
    >
      {`clicks: ${clickCount}`}
    </button>
  );
}

function _openDrawerWithTitle(title: string): void {
  act(() => {
    PluginDrawerStore.open({ title, content: <p>{`body of ${title}`}</p> });
  });
}

describe("PluginDrawerHost", () => {
  afterEach(() => {
    cleanup();
    act(() => {
      PluginDrawerStore.clear();
    });
  });

  it("resets plugin component state when a drawer opens again", async () => {
    render(<PluginDrawerHost />);
    act(() => {
      PluginDrawerStore.open({ title: "First", content: <Counter /> });
    });
    fireEvent.click(await screen.findByText("clicks: 0"));
    expect(await screen.findByText("clicks: 1")).toBeTruthy();

    act(() => {
      PluginDrawerStore.open({ title: "Second", content: <Counter /> });
    });

    expect(await screen.findByText("clicks: 0")).toBeTruthy();
  });

  it("closes the drawer when the host unmounts", () => {
    const { unmount } = render(<PluginDrawerHost />);
    _openDrawerWithTitle("Details");

    unmount();

    expect(PluginDrawerStore.getSnapshot()).toBeUndefined();
  });

  it("keeps the content in view while the drawer animates out", async () => {
    render(<PluginDrawerHost />);
    _openDrawerWithTitle("Details");
    await screen.findByText("body of Details");

    act(() => {
      PluginDrawerStore.close();
    });

    expect(screen.getByText("body of Details")).toBeTruthy();
  });

  it("drops the content once the drawer has animated out", async () => {
    render(<PluginDrawerHost />);
    _openDrawerWithTitle("Details");
    await screen.findByText("body of Details");

    act(() => {
      PluginDrawerStore.close();
    });

    await waitFor(() => {
      expect(PluginDrawerStore.getSnapshot()).toBeUndefined();
    });
  });

  it("keeps a drawer that opens before the previous exit finishes", () => {
    _openDrawerWithTitle("First");
    PluginDrawerStore.close();
    _openDrawerWithTitle("Second");

    PluginDrawerStore.clearClosed();

    expect(PluginDrawerStore.getSnapshot()?.title).toBe("Second");
  });

  it("names the drawer's close button", async () => {
    render(<PluginDrawerHost />);
    _openDrawerWithTitle("Details");

    expect(await screen.findByRole("button", { name: "Close" })).toBeTruthy();
  });

  it("reports the drawer closed after its close button is used", async () => {
    render(<PluginDrawerHost />);
    _openDrawerWithTitle("Details");

    fireEvent.click(await screen.findByRole("button", { name: "Close" }));

    expect(PluginDrawerStore.getSnapshot()?.isOpen).toBe(false);
  });
});
