import { modals } from "@mantine/modals";
import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildConsentAuditCsv } from "@/clients/privacy/buildConsentAuditCsv/buildConsentAuditCsv";
import { ClarificationAuditEntryClient } from "@/clients/privacy/ClarificationAuditEntryClient/ClarificationAuditEntryClient";
import { ConsentAuditEntryClient } from "@/clients/privacy/ConsentAuditEntryClient/ConsentAuditEntryClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { render, screen } from "@/test-utils";
import { PrivacyLogTab } from "./PrivacyLogTab";
import type { ConsentAuditEntry } from "@/models/privacy/ConsentAuditEntry/ConsentAuditEntry";

const {
  clearConsentLogMock,
  clearConsentLogAsyncMock,
  listConsentLogQueryKeyMock,
  notifySuccessMock,
  useClearConsentLogMock,
  useListClarificationLogMock,
  useListConsentLogMock,
  buildConsentAuditCsvMock,
} = vi.hoisted(() => {
  const clearConsentLogAsync = vi.fn();
  return {
    clearConsentLogMock: Object.assign(vi.fn(), {
      async: clearConsentLogAsync,
    }),
    clearConsentLogAsyncMock: clearConsentLogAsync,
    listConsentLogQueryKeyMock: vi.fn().mockReturnValue(["consent-log"]),
    notifySuccessMock: vi.fn(),
    useClearConsentLogMock: vi.fn(),
    useListClarificationLogMock: vi.fn(),
    useListConsentLogMock: vi.fn(),
    buildConsentAuditCsvMock: vi.fn().mockReturnValue("audit,csv"),
  };
});

vi.mock("@/utils/notifications/notify", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/utils/notifications/notify")>();
  return {
    ...actual,
    notifySuccess: notifySuccessMock,
  };
});

vi.mock(
  "@/clients/privacy/ConsentAuditEntryClient/ConsentAuditEntryClient",
  () => {
    return {
      ConsentAuditEntryClient: {
        QueryKeys: {
          listConsentLog: listConsentLogQueryKeyMock,
        },
        useClearConsentLog: useClearConsentLogMock,
        useListConsentLog: useListConsentLogMock,
      },
    };
  },
);

vi.mock(
  "@/clients/privacy/ClarificationAuditEntryClient/ClarificationAuditEntryClient",
  () => {
    return {
      ClarificationAuditEntryClient: {
        useListClarificationLog: useListClarificationLogMock,
      },
    };
  },
);

vi.mock(
  "@/clients/permissions/PrivateResourceAdminClient/PrivateResourceAdminClient",
  () => {
    return {
      PrivateResourceAdminClient: {
        useGetPrivateResourceCounts: () => {
          return [
            [
              {
                userId: "user-1",
                privateDashboardCount: 0,
                privateDatasetCount: 0,
                privateMapCount: 0,
              },
            ],
            false,
            { isFetching: false },
          ];
        },
        useTransferAllOwnedResources: () => {
          return [vi.fn(), false];
        },
        QueryKeys: {
          getPrivateResourceCounts: () => {
            return ["private-resource-counts"];
          },
        },
      },
    };
  },
);

vi.mock("@/clients/WorkspaceClient", () => {
  return {
    WorkspaceClient: {
      useGetUsersForWorkspace: () => {
        return [[], false, { isFetching: false }];
      },
      QueryKeys: {
        getUsersForWorkspace: () => {
          return ["users"];
        },
      },
    },
  };
});

vi.mock("@/clients/privacy/buildConsentAuditCsv/buildConsentAuditCsv", () => {
  return {
    buildConsentAuditCsv: buildConsentAuditCsvMock,
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: vi.fn(),
  };
});

const workspace = {
  id: "workspace-1",
} as ReturnType<typeof useCurrentWorkspace>;

const consentEntry = {
  id: "consent-entry-1" as ConsentAuditEntry.Id,
  workspaceId: workspace.id,
  userId: "user-1",
  threadId: null,
  timestamp: Date.UTC(2026, 6, 27),
  decision: "approved",
  context: "user_message_text",
  mode: "clean",
  detectedPii: [],
  detectedBias: [],
  sourceColumn: null,
  valueCount: 0,
  contentLengthChars: null,
  warningShown: [],
  warningDismissed: [],
  suggestionUsed: null,
  patternLocale: "en",
  detectorVersion: "1.0.0",
  medicalTierTriggeredBy: null,
  typedConfirmationCorrect: null,
  ackTokenNonce: null,
} satisfies ConsentAuditEntry.T;

describe("PrivacyLogTab", () => {
  let confirmModalOptions:
    | Parameters<typeof modals.openConfirmModal>[0]
    | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    confirmModalOptions = undefined;
    vi.mocked(useCurrentWorkspace).mockReturnValue(workspace);
    useListConsentLogMock.mockReturnValue([[consentEntry], false]);
    useListClarificationLogMock.mockReturnValue([[], false]);
    useClearConsentLogMock.mockReturnValue([clearConsentLogMock, false]);
    clearConsentLogAsyncMock.mockResolvedValue(undefined);
    vi.spyOn(modals, "openConfirmModal").mockImplementation((options) => {
      confirmModalOptions = options;
      return "clear-consent-log";
    });
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn().mockReturnValue("blob:audit"),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
      return;
    });
  });

  it("loads both audit logs through workspace-scoped client hooks", () => {
    render(<PrivacyLogTab />);

    expect(ConsentAuditEntryClient.useListConsentLog).toHaveBeenCalledWith({
      workspaceId: workspace.id,
    });
    expect(
      ClarificationAuditEntryClient.useListClarificationLog,
    ).toHaveBeenCalledWith({
      arg: workspace.id,
    });
  });

  it("waits for the clear mutation before reporting success", async () => {
    let resolveClearMutation!: () => void;
    clearConsentLogAsyncMock.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveClearMutation = resolve;
      }),
    );
    render(<PrivacyLogTab />);

    fireEvent.click(screen.getByRole("button", { name: "Clear log" }));
    const confirmationPromise = confirmModalOptions?.onConfirm?.();

    expect(clearConsentLogAsyncMock).toHaveBeenCalledWith(undefined);
    expect(clearConsentLogMock).not.toHaveBeenCalled();
    expect(notifySuccessMock).not.toHaveBeenCalled();
    expect(ConsentAuditEntryClient.useClearConsentLog).toHaveBeenCalledWith({
      queryToInvalidate: ["consent-log"],
    });

    resolveClearMutation();
    await confirmationPromise;

    expect(notifySuccessMock).toHaveBeenCalledWith("Privacy log cleared.");
  });

  it("does not report success when clearing the consent log fails", async () => {
    clearConsentLogAsyncMock.mockRejectedValue(new Error("clear failed"));
    render(<PrivacyLogTab />);

    fireEvent.click(screen.getByRole("button", { name: "Clear log" }));

    await expect(confirmModalOptions?.onConfirm?.()).rejects.toThrow(
      "clear failed",
    );
    expect(notifySuccessMock).not.toHaveBeenCalled();
  });

  it("builds the CSV from consent entries returned by the list hook", () => {
    render(<PrivacyLogTab />);

    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(buildConsentAuditCsv).toHaveBeenCalledWith([consentEntry]);
  });
});
