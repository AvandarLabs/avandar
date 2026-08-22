import { Modal } from "@mantine/core";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProductModalPresence } from "@/components/Nux/NuxChecklistPanel/ProductModalPresence/ProductModalPresence";
import { PRODUCT_MODAL_ROOT_CLASSNAME } from "@/config/Theme";
import { render, waitFor } from "@/test-utils";

function _appendClosedProductModalRoot(): HTMLElement {
  const modal = document.createElement("div");
  modal.className = PRODUCT_MODAL_ROOT_CLASSNAME;
  document.body.append(modal);
  return modal;
}

function _appendOpenProductModal(): HTMLElement {
  const modal = _appendClosedProductModalRoot();
  const dialog = document.createElement("section");
  dialog.setAttribute("role", "dialog");
  modal.append(dialog);
  return modal;
}

describe("ProductModalPresence", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("is false when no product modal is mounted", () => {
    expect(ProductModalPresence.isOpen()).toBe(false);
  });

  it("is false when a product modal root is mounted but closed", () => {
    _appendClosedProductModalRoot();
    expect(ProductModalPresence.isOpen()).toBe(false);
  });

  it("is true when a product modal dialog is open", () => {
    _appendOpenProductModal();
    expect(ProductModalPresence.isOpen()).toBe(true);
  });

  it("is false when a Mantine Modal is closed", () => {
    render(
      <Modal opened={false} onClose={vi.fn()} title="Share">
        Publish
      </Modal>,
    );
    expect(ProductModalPresence.isOpen()).toBe(false);
  });

  it("is true when a Mantine Modal is open", () => {
    render(
      <Modal opened onClose={vi.fn()} title="Share">
        Publish
      </Modal>,
    );
    expect(ProductModalPresence.isOpen()).toBe(true);
  });

  it("notifies when a product modal mounts and unmounts", async () => {
    const onChange = vi.fn();
    const stop = ProductModalPresence.subscribe(onChange);
    expect(onChange).toHaveBeenCalledTimes(1);
    onChange.mockClear();

    const modal = _appendOpenProductModal();
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(1);
    });
    onChange.mockClear();

    modal.remove();
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(1);
    });
    stop();
  });

  it("does not notify when some other body child is added", () => {
    const onChange = vi.fn();
    const stop = ProductModalPresence.subscribe(onChange);
    onChange.mockClear();

    const decoy = document.createElement("div");
    document.body.append(decoy);
    expect(onChange).not.toHaveBeenCalled();
    stop();
  });
});
