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

/**
 * Position in a case's feed: the last event already loaded. Values are kept
 * exactly as the database returned them, since a timestamp round-tripped
 * through `Date` loses microseconds and would skip or repeat events.
 */
export type ActivityFeedCursor = {
  occurredAt: string;
  recordedAt: string;
  id: string;
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
         * The newest `limit` events of the given kinds that come before the
         * `before` cursor in `(occurredAt, recordedAt, id)` order, returned
         * oldest first.
         */
        getCaseActivityPage: async (params: {
          individualId: Individual.Id;
          kinds: readonly ActivityEvent.Kind[];
          limit: number;
          before: ActivityFeedCursor | undefined;
        }): Promise<ActivityFeedPage> => {
          const logger = clientLogger.appendName("getCaseActivityPage");
          logger.log("Loading case activity", params);
          const { data } = await dbClient
            .rpc("rpc_activity_events__get_case_page", {
              p_individual_id: params.individualId,
              p_kinds: [...params.kinds],
              // One extra row tells whether an older page exists.
              p_limit: params.limit + 1,
              p_before_occurred_at: params.before?.occurredAt,
              p_before_recorded_at: params.before?.recordedAt,
              p_before_id: params.before?.id,
            })
            .select("*, comment:comments(*, reactions:comment_reactions(*))")
            .throwOnError();
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
