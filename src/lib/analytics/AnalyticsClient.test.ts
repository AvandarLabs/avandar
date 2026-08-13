import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";

const insertMock = vi.fn(async (_analyticsRow: unknown) => {
  return { error: null };
});
const getSessionMock = vi.fn(
  async (): Promise<{
    data: { session: { user: { id: string } } | null };
    error: null;
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
    isDesktopMock.mockReturnValue(false);
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });
  });

  it("stamps the row with the web client and the build version", async () => {
    await AnalyticsClient.logEvent({
      event: "dashboard.filter_changed",
      payload: { filterId: "f1", mode: "select_multi" },
    });

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

    await AnalyticsClient.logEvent({
      event: "chat.message_sent",
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ client: "desktop" }),
    );
  });

  it("does not send an event_category, because the database owns it", async () => {
    await AnalyticsClient.logEvent({
      event: "chat.sql_generated",
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

    await AnalyticsClient.logEvent({ event: "chat.message_sent" });

    expect(insertMock).not.toHaveBeenCalled();
  });

  it("never throws when the insert fails", async () => {
    insertMock.mockRejectedValueOnce(new Error("insert exploded"));

    await expect(
      AnalyticsClient.logEvent({ event: "chat.message_sent" }),
    ).resolves.toBeUndefined();
  });
});
