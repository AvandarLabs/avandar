import { makeParserRegistry } from "@clients/makeParserRegistry.ts";
import { pipe } from "@utils/misc/pipe/pipe.ts";
import { camelCaseKeysDeep } from "@utils/objects/camelCaseKeys/camelCaseKeys.ts";
import { excludeNullsDeep } from "@utils/objects/excludeNullsDeep/excludeNullsDeep.ts";
import { coerceDatesInProps } from "@utils/objects/hofs/coerceDatesInProps/coerceDatesInProps.ts";
import { convertDatesToISOInProps } from "@utils/objects/hofs/convertDatesToISOInProps/convertDatesToISOInProps.ts";
import { nullsToUndefinedDeep } from "@utils/objects/nullsToUndefinedDeep/nullsToUndefinedDeep.ts";
import { snakeCaseKeysDeep } from "@utils/objects/snakeCaseKeys/snakeCaseKeys.ts";
import { undefinedsToNullsDeep } from "@utils/objects/undefinedsToNullsDeep/undefinedsToNullsDeep.ts";
import { SubscriptionModule } from "$/models/Subscription/SubscriptionModule.ts";
import { z } from "zod";
import type {
  Expect,
  ZodSchemaEqualsTypes,
} from "@utils/types/test-utilities.types.ts";
import type {
  PolarCustomerId,
  PolarProductId,
  SubscriptionId,
  SubscriptionModel,
  SubscriptionRead,
} from "$/models/Subscription/Subscription.types.ts";
import type { UserId } from "$/models/User/User.types.ts";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types.ts";

const DBReadSchema = z.object({
  polar_subscription_id: z.uuid(),
  workspace_id: z.uuid(),
  subscription_owner_id: z.uuid(),
  polar_customer_id: z.uuid(),
  polar_customer_email: z.string(),
  polar_product_id: z.uuid(),
  feature_plan_type: z.enum(SubscriptionModule.FeaturePlanTypes),
  subscription_status: z.enum(SubscriptionModule.Statuses),
  started_at: z.iso.datetime({ offset: true }).nullable(),
  ends_at: z.iso.datetime({ offset: true }).nullable(),
  ended_at: z.iso.datetime({ offset: true }).nullable(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
  current_period_start: z.iso.datetime({ offset: true }).nullable(),
  current_period_end: z.iso.datetime({ offset: true }).nullable(),
  max_seats_allowed: z.number(),
  max_datasets_allowed: z.number().nullable(),
  max_dashboards_allowed: z.number().nullable(),
  max_shareable_dashboards_allowed: z.number().nullable(),
});

export const SubscriptionParsers =
  makeParserRegistry<SubscriptionModel>().build({
    modelName: "Subscription",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      coerceDatesInProps([
        "createdAt",
        "updatedAt",
        "startedAt",
        "endsAt",
        "endedAt",
        "currentPeriodStart",
        "currentPeriodEnd",
      ]),
      (obj): SubscriptionRead => {
        return {
          ...obj,
          workspaceId: obj.workspaceId as WorkspaceId,
          subscriptionOwnerId: obj.subscriptionOwnerId as UserId,
          polarCustomerId: obj.polarCustomerId as PolarCustomerId,
          polarSubscriptionId: obj.polarSubscriptionId as SubscriptionId,
          polarProductId: obj.polarProductId as PolarProductId,
        };
      },
    ),

    fromModelInsertToDBInsert: pipe(
      snakeCaseKeysDeep,
      undefinedsToNullsDeep,
      excludeNullsDeep,
      convertDatesToISOInProps([
        "created_at",
        "updated_at",
        "started_at",
        "ends_at",
        "ended_at",
        "current_period_start",
        "current_period_end",
      ]),
    ),

    fromModelUpdateToDBUpdate: pipe(
      snakeCaseKeysDeep,
      undefinedsToNullsDeep,
      excludeNullsDeep,
      convertDatesToISOInProps([
        "created_at",
        "updated_at",
        "started_at",
        "ends_at",
        "ended_at",
        "current_period_start",
        "current_period_end",
      ]),
    ),
  });

/**
 * Do not remove these tests!
 */
type CRUDTypes = SubscriptionModel;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Type tests - this variable is intentionally not used
type ZodConsistencyTests = [
  // Check that the DBReadSchema is consistent with the DBRead type.
  Expect<
    ZodSchemaEqualsTypes<
      typeof DBReadSchema,
      { input: CRUDTypes["DBRead"]; output: CRUDTypes["DBRead"] }
    >
  >,
];
