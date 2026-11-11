import { Drawer, Modal } from "@mantine/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductDrawerPresence } from "@/components/Nux/NuxChecklistPanel/ProductDrawerPresence/ProductDrawerPresence";
import { render, waitFor } from "@/test-utils";

describe("ProductDrawerPresence", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("is false when no drawer is mounted", () => {
    expect(ProductDrawerPresence.isOpen()).toBe(false);
  });

  it("is false when a Drawer is closed", () => {
    render(
      <Drawer opened={false} onClose={vi.fn()} title="Export">
        Download PDF
      </Drawer>,
    );
    expect(ProductDrawerPresence.isOpen()).toBe(false);
  });

  it("is true when a Drawer is open", () => {
    render(
      <Drawer opened onClose={vi.fn()} title="Export">
        Download PDF
      </Drawer>,
    );
    expect(ProductDrawerPresence.isOpen()).toBe(true);
  });

  it("is true when an open Drawer passes its own classNames", () => {
    render(
      <Drawer
        opened
        onClose={vi.fn()}
        title="Filters"
        classNames={{ body: "custom-body" }}
      >
        Status
      </Drawer>,
    );
    expect(ProductDrawerPresence.isOpen()).toBe(true);
  });

  it("is false while only a Modal is open", () => {
    render(
      <Modal opened onClose={vi.fn()} title="Share">
        Publish
      </Modal>,
    );
    expect(ProductDrawerPresence.isOpen()).toBe(false);
  });

  it("notifies when a Drawer opens and closes", async () => {
    const onChange = vi.fn();
    const stop = ProductDrawerPresence.subscribe(onChange);
    onChange.mockClear();
    const { rerender } = render(
      <Drawer opened onClose={vi.fn()} title="Export">
        Download PDF
      </Drawer>,
    );
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(1);
    });
    onChange.mockClear();

    rerender(
      <Drawer opened={false} onClose={vi.fn()} title="Export">
        Download PDF
      </Drawer>,
    );
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(1);
    });
    stop();
  });
});
