import { ActivityEventParsers } from "$/models/activity/ActivityEvent/ActivityEvent";
import { CommentParsers } from "$/models/comments/Comment/Comment";
import { CommentReactionParsers } from "$/models/comments/CommentReaction/CommentReaction";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import type { ActivityEvent } from "$/models/activity/ActivityEvent/ActivityEvent";
import type { Comment } from "$/models/comments/Comment/Comment";
import type { CommentReaction } from "$/models/comments/CommentReaction/CommentReaction";
import type { Individual } from "$/models/ontology/Individual/Individual";

/**
 * One feed entry: the event plus, for comment kinds, the comment and its
 * reactions.
 */
export type ActivityFeedEntry = ActivityEvent.T & {
  comment: Comment.T | undefined;
  reactions: CommentReaction.T[];
};

/** One page of a case's feed, oldest entry first. */
export type ActivityFeedPage = {
  entries: ActivityFeedEntry[];
  hasMore: boolean;
};

/** Reads a case's activity log. Only database triggers write it. */
export const ActivityEventClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "ActivityEvent",
    tableName: "activity_events",
    dbTablePrimaryKey: "id",
    parsers: ActivityEventParsers,
    queries: ({ clientLogger, dbClient, parsers }) => {
      return {
        /**
         * The newest `limit` events of the given kinds that occurred before
         * `beforeOccurredAt`, returned oldest first.
         */
        getCaseActivityPage: async (params: {
          individualId: Individual.Id;
          kinds: readonly ActivityEvent.Kind[];
          beforeOccurredAt: string | undefined;
          limit: number;
        }): Promise<ActivityFeedPage> => {
          const logger = clientLogger.appendName("getCaseActivityPage");
          logger.log("Loading case activity", params);
          let query = dbClient
            .from("activity_events")
            .select("*, comment:comments(*, reactions:comment_reactions(*))")
            .eq("individual_id", params.individualId)
            .in("kind", [...params.kinds])
            .order("occurred_at", { ascending: false })
            .order("id", { ascending: false })
            .limit(params.limit + 1);
          if (params.beforeOccurredAt !== undefined) {
            query = query.lt("occurred_at", params.beforeOccurredAt);
          }
          const { data } = await query.throwOnError();
          const rows = data.slice(0, params.limit).reverse();
          return {
            hasMore: data.length > params.limit,
            entries: rows.map((row): ActivityFeedEntry => {
              const { comment, ...event } = row;
              if (comment === null) {
                return {
                  ...parsers.fromDBReadToModelRead(event),
                  comment: undefined,
                  reactions: [],
                };
              }
              const { reactions, ...commentRow } = comment;
              return {
                ...parsers.fromDBReadToModelRead(event),
                comment: CommentParsers.fromDBReadToModelRead(commentRow),
                reactions: reactions.map(
                  CommentReactionParsers.fromDBReadToModelRead,
                ),
              };
            }),
          };
        },
      };
    },
  }),
  { queryFns: ["getCaseActivityPage"] },
);
