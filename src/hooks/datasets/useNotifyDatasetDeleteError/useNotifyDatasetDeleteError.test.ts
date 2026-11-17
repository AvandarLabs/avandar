import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatasetDeleteError } from "@/clients/datasets/DatasetClient/DatasetDeleteError";
import { useNotifyDatasetDeleteError } from "@/hooks/datasets/useNotifyDatasetDeleteError/useNotifyDatasetDeleteError";
import { renderHook } from "@/test-utils";
import type { ReactNode } from "react";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const mocks = vi.hoisted(() => {
  return { notifyErrorMock: vi.fn(), reportErrorMock: vi.fn() };
});

vi.mock("@/utils/notifications/notify", () => {
  return { notifyError: mocks.notifyErrorMock };
});

vi.mock("@avandar/query-hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@avandar/query-hooks")>();
  return {
    ...actual,
    useAvaQueryErrorReporter: () => {
      return mocks.reportErrorMock;
    },
  };
});

// The hook resolves its copy through `useLingui`, which throws without a
// provider above it.
const _wrapper = ({ children }: { children: ReactNode }): ReactNode => {
  return createElement(I18nProvider, { i18n }, children);
};

const _renderNotifier = (
  options?: Parameters<typeof useNotifyDatasetDeleteError>[0],
): ReturnType<typeof useNotifyDatasetDeleteError> => {
  const { result } = renderHook(
    () => {
      return useNotifyDatasetDeleteError(options);
    },
    { wrapper: _wrapper },
  );
  return result.current;
};

const DATASET_ID = "11111111-1111-4111-8111-111111111111" as Dataset.Id;

describe("useNotifyDatasetDeleteError", () => {
  beforeEach(() => {
    mocks.notifyErrorMock.mockReset();
    mocks.reportErrorMock.mockReset();
  });

  it("tells the user they lack permission when the delete was not allowed", () => {
    const notify = _renderNotifier();

    notify(
      new DatasetDeleteError({ datasetId: DATASET_ID, reason: "not_allowed" }),
    );

    expect(mocks.notifyErrorMock).toHaveBeenCalledWith({
      title: "Dataset not deleted",
      message: "You don't have permission to delete this dataset.",
    });
  });

  it("tells the user the data may be gone when the dataset row is still there", () => {
    const notify = _renderNotifier();

    notify(
      new DatasetDeleteError({ datasetId: DATASET_ID, reason: "still_present" }),
    );

    expect(mocks.notifyErrorMock).toHaveBeenCalledWith({
      title: "Dataset not deleted",
      message:
        "The dataset could not be fully deleted. Its data may already be gone. Check it in Data Sources and delete it again.",
    });
  });

  it("never shows the log-only error message to the user", () => {
    const notify = _renderNotifier();
    const error = new DatasetDeleteError({
      datasetId: DATASET_ID,
      reason: "not_allowed",
    });

    notify(error);

    expect(JSON.stringify(mocks.notifyErrorMock.mock.calls)).not.toContain(
      DATASET_ID,
    );
  });

  it("hands any other error to the caller's own handler", () => {
    const onOtherError = vi.fn();
    const notify = _renderNotifier({ onOtherError });
    const error = new Error("storage down");

    notify(error);

    expect(onOtherError).toHaveBeenCalledWith(error);
    expect(mocks.notifyErrorMock).not.toHaveBeenCalled();
  });

  it("reports any other error through the app reporter when no handler is given", () => {
    const notify = _renderNotifier();
    const error = new Error("storage down");

    notify(error);

    expect(mocks.reportErrorMock).toHaveBeenCalledWith({
      title: "An unexpected error occurred",
      message: "Please contact support for assistance.",
      cause: error,
    });
    expect(mocks.notifyErrorMock).not.toHaveBeenCalled();
  });
});
