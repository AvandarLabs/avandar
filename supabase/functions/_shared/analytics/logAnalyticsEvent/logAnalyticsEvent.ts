import type {
  AnalyticsApp,
  ServerAnalyticsEvent,
} from "$/analytics/AnalyticsEvents/AnalyticsEvents.types.ts";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";

type LogAnalyticsEventOptions = ServerAnalyticsEvent & {
  supabaseAdminClient: AvaSupabaseClient;
  workspaceId?: string;
  userId?: string;
  app?: AnalyticsApp;
};

/** Records a server analytics event without propagating persistence errors. */
export async function logAnalyticsEvent(
  options: Readonly<LogAnalyticsEventOptions>,
): Promise<void> {
  const { supabaseAdminClient, event, payload, workspaceId, userId, app } =
    options;

  try {
    await supabaseAdminClient
      .from("usage_analytics_events")
      .insert({
        event_name: event,
        workspace_id: workspaceId ?? null,
        user_id: userId ?? null,
        app: app ?? null,
        payload: (payload as never) ?? null,
        client: "server",
        app_version: null,
      })
      .throwOnError();
  } catch (error) {
    console.error("[analytics] failed to log event", event, error);
  }
}
