import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { ModalsProvider } from "@mantine/modals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AvandarUiProvider } from "@/components/AvandarUiProvider";
import { DEFAULT_MODAL_PROPS } from "@/config/Theme";
import {
  clearLocalChatModelDownloaded,
  isLocalChatModelMarkedDownloaded,
  markLocalChatModelDownloaded,
} from "@/lib/offlineChat/localChatModelStore";
import { OfflineChatDownloadControl } from "./OfflineChatDownloadControl";

const { deleteModelMock } = vi.hoisted(() => {
  return {
    deleteModelMock: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("@/lib/offlineChat/useOfflineChatManagerStatus", () => {
  return {
    useOfflineChatManagerStatus: () => {
      return { kind: "idle" as const };
    },
  };
});

vi.mock("@/lib/offlineChat/OfflineChatResourceManager", () => {
  return {
    OfflineChatResourceManager: {
      ensureEngine: vi.fn(),
      deleteModel: deleteModelMock,
    },
  };
});

function renderControl() {
  return render(
    <I18nProvider i18n={i18n}>
      <AvandarUiProvider>
        <ModalsProvider modalProps={DEFAULT_MODAL_PROPS}>
          <OfflineChatDownloadControl />
        </ModalsProvider>
      </AvandarUiProvider>
    </I18nProvider>,
  );
}

describe("OfflineChatDownloadControl", () => {
  beforeEach(() => {
    window.localStorage.clear();
    deleteModelMock.mockClear();
  });

  afterEach(() => {
    window.localStorage.clear();
    clearLocalChatModelDownloaded("qwen-1.5b");
    clearLocalChatModelDownloaded("llama-1b");
  });

  it("keeps the download control clickable after a model is marked downloaded", () => {
    markLocalChatModelDownloaded("qwen-1.5b");

    renderControl();

    const button = screen.getByRole("button", {
      name: /offline chat model/i,
    });
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute(
      "aria-label",
      expect.stringMatching(/switch or re-download/i),
    );
  });

  it("removes a downloaded model after confirmation", async () => {
    markLocalChatModelDownloaded("qwen-1.5b");
    deleteModelMock.mockImplementation(async () => {
      clearLocalChatModelDownloaded("qwen-1.5b");
    });

    renderControl();

    fireEvent.click(
      screen.getByRole("button", { name: /offline chat model/i }),
    );

    const removeButton = await screen.findByRole("button", {
      name: /remove qwen/i,
    });
    fireEvent.click(removeButton);

    const confirmButton = await screen.findByRole("button", {
      name: /^Remove$/i,
    });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(deleteModelMock).toHaveBeenCalledWith("qwen-1.5b");
    });
    await waitFor(() => {
      expect(isLocalChatModelMarkedDownloaded("qwen-1.5b")).toBe(false);
    });
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /remove qwen/i }),
      ).not.toBeInTheDocument();
    });
  });
});
