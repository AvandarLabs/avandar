import { createServiceClient } from "@avandar/clients";
import { withLogger } from "@avandar/logger";
import { withQueryHooks } from "@avandar/query-hooks";
import { objectKeys } from "@avandar/utils";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import type {
  AnalyticsApp,
  AnalyticsEventName,
  AnalyticsEventPayload,
} from "@/lib/analytics/analyticsEventTypes";
import type { ServiceClient } from "@avandar/clients";
import type { WithLogger } from "@avandar/logger";
import type { WithQueryHooks } from "@avandar/query-hooks";
import type { Workspace } from "$/models/Workspace/Workspace";

type LogEventOptions = {
  event: AnalyticsEventName;
  workspaceId?: Workspace.Id;
  app?: AnalyticsApp;
  payload?: AnalyticsEventPayload;
};

type AnalyticsClientMutations = {
  logEvent: (options: LogEventOptions) => Promise<void>;
};

type IAnalyticsClient = ServiceClient & AnalyticsClientMutations;

function createAnalyticsClient(): WithLogger<
  WithQueryHooks<IAnalyticsClient, never, keyof AnalyticsClientMutations>
> {
  const baseClient = createServiceClient("AnalyticsClient");

  return withLogger(baseClient, (clientLogger) => {
    const mutations: AnalyticsClientMutations = {
      /**
       * Fire-and-forget analytics event logger. Inserts a row into
       * `usage_analytics_events`. Failures are intentionally swallowed:
       * analytics must never break a user action. Workspace + user are
       * resolved from the Supabase session so callers don't have to thread
       * `userId` through every call site. RLS on the table enforces that the
       * inserted `user_id` matches `auth.uid()`.
       */
      logEvent: async (options: LogEventOptions): Promise<void> => {
        const logger = clientLogger.appendName("logEvent");
        logger.log("Logging analytics event", options);
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
      },
    };

    return withQueryHooks(
      { ...baseClient, ...mutations },
      {
        mutationFns: objectKeys(mutations),
      },
    );
  });
}

/**
 * Client for recording product-usage analytics events.
 */
export const AnalyticsClient = createAnalyticsClient();
