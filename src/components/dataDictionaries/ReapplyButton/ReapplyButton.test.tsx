import { ModalsProvider } from "@mantine/modals";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReapplyButton } from "@/components/dataDictionaries/ReapplyButton/ReapplyButton";
import { DEFAULT_MODAL_PROPS } from "@/config/Theme";
import { fireEvent, render, screen } from "@/test-utils";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const mocks = vi.hoisted(() => {
  return {
    reapply: vi.fn(),
    source: undefined as unknown,
  };
});

vi.mock(
  "@/hooks/dataDictionaries/useReapplyDictionary/useReapplyDictionary",
  () => {
    return {
      useReapplyDictionary: () => {
        return [mocks.reapply, false];
      },
    };
  },
);
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      useGetSourceDataset: () => {
        return [mocks.source, false];
      },
    },
  };
});

const DATASET = {
  id: "dataset-1" as Dataset.Id,
  name: "Kings line list",
  sourceType: "csv_file" as const,
};

function _renderButton(): void {
  render(
    <ReapplyButton
      dataset={DATASET}
      dictionaryId={"dict-1" as DataDictionary.Id}
      dictionaryName="NYS codes"
    />,
    {
      wrapper: ({ children }) => {
        return (
          <ModalsProvider modalProps={DEFAULT_MODAL_PROPS}>
            {children}
          </ModalsProvider>
        );
      },
    },
  );
}

describe("ReapplyButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("asks first for a synced upload, since it changes it for everyone", async () => {
    mocks.source = { isInCloudStorage: true };
    _renderButton();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Re-apply NYS codes to Kings line list",
      }),
    );

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(
      "This changes Kings line list for everyone in the workspace who uses it.",
    );
    expect(mocks.reapply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Re-apply" }));
    expect(mocks.reapply).toHaveBeenCalledTimes(1);
  });

  it("re-applies an offline-only upload at once", () => {
    mocks.source = { isInCloudStorage: false };
    _renderButton();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Re-apply NYS codes to Kings line list",
      }),
    );

    expect(mocks.reapply).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
