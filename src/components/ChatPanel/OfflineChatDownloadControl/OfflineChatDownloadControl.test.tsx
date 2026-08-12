import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { ModalsProvider } from "@mantine/modals";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { DEFAULT_MODAL_PROPS } from "@/config/Theme";
import { LocalChatModelStore } from "@/stores/LocalChatModelStore/LocalChatModelStore";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { OfflineChatDownloadControl } from "./OfflineChatDownloadControl";

const { deleteModelMock } = vi.hoisted(() => {
  return {
    deleteModelMock: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("@/hooks/localChatModels/useOfflineChatEngineStatus", () => {
  return {
    useOfflineChatEngineStatus: () => {
      return { kind: "idle" as const };
    },
  };
});

vi.mock("@/stores/OfflineChatEngineStore/OfflineChatEngineStore", () => {
  return {
    OfflineChatEngineStore: {
      ensureEngine: vi.fn(),
      deleteModel: deleteModelMock,
    },
  };
});

function renderControl() {
  return render(
    <I18nProvider i18n={i18n}>
      <AvandarAppProvider>
        <ModalsProvider modalProps={DEFAULT_MODAL_PROPS}>
          <OfflineChatDownloadControl />
        </ModalsProvider>
      </AvandarAppProvider>
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
    LocalChatModelStore.clearDownloaded("qwen-1.5b");
    LocalChatModelStore.clearDownloaded("llama-1b");
  });

  it("keeps the download control clickable after a model is marked downloaded", () => {
    LocalChatModelStore.markDownloaded("qwen-1.5b");

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
    LocalChatModelStore.markDownloaded("qwen-1.5b");
    deleteModelMock.mockImplementation(async () => {
      LocalChatModelStore.clearDownloaded("qwen-1.5b");
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
      expect(LocalChatModelStore.isDownloaded("qwen-1.5b")).toBe(false);
    });
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /remove qwen/i }),
      ).not.toBeInTheDocument();
    });
  });
});
