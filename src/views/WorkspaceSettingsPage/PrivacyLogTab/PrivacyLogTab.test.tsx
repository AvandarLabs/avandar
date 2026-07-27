import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConsentAuditEntryClient } from "@/clients/privacy/ConsentAuditEntryClient";
import { ClarificationAuditEntryClient } from "@/clients/privacy/ClarificationAuditEntryClient";
import { buildConsentAuditCsv } from "@/clients/privacy/buildConsentAuditCsv";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { render, screen, waitFor, within } from "@/test-utils";
import { PrivacyLogTab } from "./PrivacyLogTab";
import type { ConsentAuditEntry } from "@/models/privacy/ConsentAuditEntry/ConsentAuditEntry";

const {
  clearConsentLogMock,
  listConsentLogQueryKeyMock,
  useClearConsentLogMock,
  useListClarificationLogMock,
  useListConsentLogMock,
  buildConsentAuditCsvMock,
} = vi.hoisted(() => {
  return {
    clearConsentLogMock: vi.fn().mockResolvedValue(undefined),
    listConsentLogQueryKeyMock: vi.fn().mockReturnValue(["consent-log"]),
    useClearConsentLogMock: vi.fn(),
    useListClarificationLogMock: vi.fn(),
    useListConsentLogMock: vi.fn(),
    buildConsentAuditCsvMock: vi.fn().mockReturnValue("audit,csv"),
  };
});

vi.mock("@/clients/privacy/ConsentAuditEntryClient", () => {
  return {
    ConsentAuditEntryClient: {
      QueryKeys: {
        listConsentLog: listConsentLogQueryKeyMock,
      },
      useClearConsentLog: useClearConsentLogMock,
      useListConsentLog: useListConsentLogMock,
    },
  };
});

vi.mock("@/clients/privacy/ClarificationAuditEntryClient", () => {
  return {
    ClarificationAuditEntryClient: {
      useListClarificationLog: useListClarificationLogMock,
    },
  };
});

vi.mock("@/clients/privacy/buildConsentAuditCsv", () => {
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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCurrentWorkspace).mockReturnValue(workspace);
    useListConsentLogMock.mockReturnValue([[consentEntry], false]);
    useListClarificationLogMock.mockReturnValue([[], false]);
    useClearConsentLogMock.mockReturnValue([clearConsentLogMock, false]);
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

  it("clears consent entries through a mutation that invalidates the active query", async () => {
    render(<PrivacyLogTab />);

    fireEvent.click(screen.getByRole("button", { name: "Clear log" }));
    const dialog = await screen.findByRole("dialog", {
      name: "Clear privacy log",
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Clear log" }));

    await waitFor(() => {
      expect(clearConsentLogMock).toHaveBeenCalledTimes(1);
    });
    expect(ConsentAuditEntryClient.useClearConsentLog).toHaveBeenCalledWith({
      queryToInvalidate: ["consent-log"],
    });
  });

  it("builds the CSV from consent entries returned by the list hook", () => {
    render(<PrivacyLogTab />);

    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(buildConsentAuditCsv).toHaveBeenCalledWith([consentEntry]);
  });
});
