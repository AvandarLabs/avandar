import { Simplify } from "type-fest";
import { BillingAPI } from "../../supabase/functions/billing/billing.types";
import { API as GoogleAuthCallbackAPI } from "../../supabase/functions/google-auth-callback/api.types";
import { API as GoogleAuthAPI } from "../../supabase/functions/google-auth/api.types";
import { API as GoogleSheetsAPI } from "../../supabase/functions/google-sheets/api.types";
import { API as PolarPublicAPI } from "../../supabase/functions/polar-public/polar-public.types";

/**
 * Any new APIs that get added to the supabase/functions directory should
 * be added here.
 */
type FullAPI = GoogleAuthAPI &
  GoogleAuthCallbackAPI &
  GoogleSheetsAPI &
  PolarPublicAPI &
  BillingAPI;

type FlattenedAPI = {
  [FnName in Extract<keyof FullAPI, string>]: {
    [RouteName in Extract<
      keyof FullAPI[FnName],
      string
    > as `${FnName}${RouteName}`]: FullAPI[FnName][RouteName];
  };
}[Extract<keyof FullAPI, string>];

type UnionToIntersection<U> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I
  : never;

export type API = Simplify<UnionToIntersection<FlattenedAPI>>;
export type APIReturnType<Route extends keyof API> = API[Route]["returnType"];
