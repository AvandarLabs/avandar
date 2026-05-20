import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import type {
  AnalyticsApp,
  AnalyticsEventName,
  AnalyticsEventPayload,
} from "@/lib/analytics/analyticsEventTypes";
import type { Workspace } from "$/models/Workspace/Workspace";

type LogEventOptions = {
  event: AnalyticsEventName;
  workspaceId?: Workspace.Id;
  app?: AnalyticsApp;
  payload?: AnalyticsEventPayload;
};

/**
 * Fire-and-forget analytics event logger. Inserts a row into
 * `usage_analytics_events`. Failures are intentionally swallowed — analytics
 * must never break a user action. Workspace + user are resolved from the
 * Supabase session so callers don't have to thread `userId` through every
 * call site. RLS on the table enforces that the inserted `user_id` matches
 * `auth.uid()`.
 */
export async function logAnalyticsEvent(
  options: LogEventOptions,
): Promise<void> {
  try {
    const db = AvaSupabase.db();
    const sessionResult = await db.auth.getSession();
    const userId = sessionResult.data.session?.user.id ?? null;

    if (!userId) {
      return;
    }

    await db.from("usage_analytics_events").insert({
      event_name: options.event,
      workspace_id: options.workspaceId ?? null,
      app: options.app ?? null,
      payload: (options.payload as never) ?? null,
      user_id: userId,
    });
  } catch {
    // Analytics must never block a user action. Swallow.
  }
}
