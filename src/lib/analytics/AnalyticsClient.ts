import { createServiceClient } from "@avandar/clients";
import { withLogger } from "@avandar/logger";
import { withQueryHooks } from "@avandar/query-hooks";
import { objectKeys } from "@avandar/utils";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import { isDesktop } from "$/platform/isDesktop";
import type {
  AnalyticsApp,
  ClientAnalyticsEvent,
} from "$/analytics/AnalyticsEvents/AnalyticsEvents.types";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ServiceClient } from "@avandar/clients";
import type { WithLogger } from "@avandar/logger";
import type { WithQueryHooks } from "@avandar/query-hooks";

/**
 * A client-emitted event plus its optional scoping. `ClientAnalyticsEvent` is
 * a discriminated union over event name, so passing one event's payload shape
 * under a different event name is a compile error. Server-owned and
 * trigger-owned events are deliberately not assignable here.
 */
type LogEventOptions = ClientAnalyticsEvent & {
  workspaceId?: Workspace.Id;
  app?: AnalyticsApp;
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

          if (sessionResult.error) {
            throw sessionResult.error;
          }

          const userId = sessionResult.data.session?.user.id ?? undefined;

          if (!userId) {
            return;
          }

          // The database derives `event_category` from `event_name`.
          await db
            .from("usage_analytics_events")
            .insert({
              event_name: options.event,
              workspace_id: options.workspaceId ?? null,
              app: options.app ?? null,
              payload: (options.payload as never) ?? null,
              user_id: userId,
              client: isDesktop() ? "desktop" : "web",
              app_version: import.meta.env.VITE_APP_VERSION ?? null,
            })
            .throwOnError();
        } catch (error) {
          // Analytics must never block a user action, so this is swallowed.
          // Development warnings expose defects while production stays silent.
          if (import.meta.env.DEV) {
            console.warn("[analytics] failed to log event", options, error);
          }
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
