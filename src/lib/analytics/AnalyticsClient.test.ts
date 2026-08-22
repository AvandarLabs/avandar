import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";

const CHAT_MESSAGE_SENT_EVENT = {
  event: "chat.message_sent" as const,
  payload: {
    promptChars: 5,
    pageApp: "other" as const,
    runtimeMode: "cloud" as const,
    hasOpenDataset: false,
  },
};

const FILTER_CHANGED_EVENT = {
  event: "dashboard.filter_changed" as const,
  payload: {
    dashboardId: "dashboard-1",
    filterId: "filter-1",
    mode: "select_multi" as const,
    wasCleared: false,
  },
};

const throwOnErrorMock = vi.fn(async () => {
  return { error: null };
});
const insertMock = vi.fn((_analyticsRow: unknown) => {
  return { throwOnError: throwOnErrorMock };
});
const getSessionMock = vi.fn(
  async (): Promise<{
    data: { session: { user: { id: string } } | null };
    error: Error | null;
  }> => {
    return { data: { session: { user: { id: "user-1" } } }, error: null };
  },
);
const isDesktopMock = vi.fn(() => {
  return false;
});

vi.mock("$/db/supabase/AvaSupabase", () => {
  return {
    AvaSupabase: {
      db: vi.fn(() => {
        return {
          auth: { getSession: getSessionMock },
          from: vi.fn(() => {
            return { insert: insertMock };
          }),
        };
      }),
    },
  };
});

vi.mock("$/platform/isDesktop", () => {
  return {
    isDesktop: () => {
      return isDesktopMock();
    },
  };
});

describe("AnalyticsClient.logEvent", () => {
  beforeEach(() => {
    insertMock.mockClear();
    throwOnErrorMock.mockClear();
    throwOnErrorMock.mockResolvedValue({ error: null });
    isDesktopMock.mockReturnValue(false);
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stamps the row with the web client and the build version", async () => {
    await AnalyticsClient.logEvent(FILTER_CHANGED_EVENT);

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: "dashboard.filter_changed",
        client: "web",
        app_version: import.meta.env.VITE_APP_VERSION,
        user_id: "user-1",
      }),
    );
  });

  it("stamps the row as desktop when running in the desktop shell", async () => {
    isDesktopMock.mockReturnValue(true);

    await AnalyticsClient.logEvent(CHAT_MESSAGE_SENT_EVENT);

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ client: "desktop" }),
    );
  });

  it("does not send an event_category, because the database owns it", async () => {
    await AnalyticsClient.logEvent({
      event: "chat.sql_generated",
      payload: { sqlChars: 8 },
    });

    expect(insertMock).toHaveBeenCalledOnce();
    const insertedRow = insertMock.mock.calls[0]?.[0];
    expect(insertedRow).not.toHaveProperty("event_category");
  });

  it("records nothing when there is no session", async () => {
    getSessionMock.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    await AnalyticsClient.logEvent(CHAT_MESSAGE_SENT_EVENT);

    expect(insertMock).not.toHaveBeenCalled();
  });

  it("never throws when the insert fails", async () => {
    throwOnErrorMock.mockRejectedValueOnce(new Error("insert exploded"));

    await expect(
      AnalyticsClient.logEvent(CHAT_MESSAGE_SENT_EVENT),
    ).resolves.toBeUndefined();
  });

  it("warns when Supabase returns an insert error", async () => {
    const insertError = new Error("insert failed");
    throwOnErrorMock.mockRejectedValueOnce(insertError);

    await expect(
      AnalyticsClient.logEvent(CHAT_MESSAGE_SENT_EVENT),
    ).resolves.toBeUndefined();

    expect(throwOnErrorMock).toHaveBeenCalledOnce();
    expect(console.warn).toHaveBeenCalledWith(
      "[analytics] failed to log event",
      CHAT_MESSAGE_SENT_EVENT,
      insertError,
    );
  });

  it("warns and records nothing when session lookup fails", async () => {
    const sessionError = new Error("session failed");
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
      error: sessionError,
    });

    await expect(
      AnalyticsClient.logEvent(CHAT_MESSAGE_SENT_EVENT),
    ).resolves.toBeUndefined();

    expect(insertMock).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      "[analytics] failed to log event",
      CHAT_MESSAGE_SENT_EVENT,
      sessionError,
    );
  });
});
