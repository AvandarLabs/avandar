import { z } from "zod";
import { makeParserRegistry } from "@/lib/models/makeParserRegistry";
import { Expect, ZodSchemaEqualsTypes } from "@/lib/types/testUtilityTypes";
import {
  coerceDatesInProps,
  convertDatesToISOInProps,
} from "@/lib/utils/objects/higherOrderFuncs";
import {
  camelCaseKeysDeep,
  excludeNullsDeep,
  nullsToUndefinedDeep,
  snakeCaseKeysDeep,
  undefinedsToNullsDeep,
} from "@/lib/utils/objects/transformations";
import { pipe } from "@/lib/utils/pipe";
import { UserId } from "../User/User.types";
import { WorkspaceId } from "../Workspace/Workspace.types";
import {
  PolarCustomerId,
  PolarProductId,
  PolarSubscriptionId,
  Subscription,
  SubscriptionId,
  SubscriptionModel,
} from "./Subscription.types";
import { Subscriptions } from "./Subscriptions";

const DBReadSchema = z.object({
  id: z.uuid(),
  workspace_id: z.uuid(),
  subscription_owner_id: z.uuid(),
  polar_customer_id: z.uuid(),
  polar_customer_email: z.string(),
  polar_subscription_id: z.uuid(),
  polar_product_id: z.uuid(),
  feature_plan_type: z.enum(Subscriptions.FeaturePlanTypes),
  subscription_status: z.enum(Subscriptions.Statuses),
  started_at: z.iso.datetime({ offset: true }).nullable(),
  ends_at: z.iso.datetime({ offset: true }).nullable(),
  ended_at: z.iso.datetime({ offset: true }).nullable(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
  current_period_start: z.iso.datetime({ offset: true }).nullable(),
  current_period_end: z.iso.datetime({ offset: true }).nullable(),
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
      ]),
      (obj): Subscription => {
        return {
          ...obj,
          id: obj.id as SubscriptionId,
          workspaceId: obj.workspaceId as WorkspaceId,
          subscriptionOwnerId: obj.subscriptionOwnerId as UserId,
          polarCustomerId: obj.polarCustomerId as PolarCustomerId,
          polarSubscriptionId: obj.polarSubscriptionId as PolarSubscriptionId,
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
