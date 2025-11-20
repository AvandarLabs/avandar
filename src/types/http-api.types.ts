import type { GoogleAuthCallbackAPI } from "../../supabase/functions/google-auth-callback/google-auth-callback.types";
import type { GoogleAuthAPI } from "../../supabase/functions/google-auth/google-auth.types";
import type { GoogleSheetsAPI } from "../../supabase/functions/google-sheets/google-sheets.types";
import type { PolarPublicAPI } from "../../supabase/functions/polar-public/polar-public.types";
import type { SubscriptionsAPI } from "../../supabase/functions/subscriptions/subscriptions.types";
import type { WaitlistAPI } from "../../supabase/functions/waitlist/waitlist.types";
import type { Simplify } from "type-fest";

export type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

/**
 * Any new APIs that get added to the supabase/functions directory should
 * be added here.
 */
type FullAPI = GoogleAuthAPI &
  GoogleAuthCallbackAPI &
  GoogleSheetsAPI &
  PolarPublicAPI &
  SubscriptionsAPI &
  WaitlistAPI;

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

export type APIReturnType<Route extends keyof API, Method extends HTTPMethod> =
  Method extends keyof API[Route] ?
    "returnType" extends keyof API[Route][Method] ?
      API[Route][Method]["returnType"]
    : never
  : never;

export type APIRoute<Route extends keyof API, Method extends HTTPMethod> = {
  route: Route;
  method: Method;
};

export type APIQueryParams<Route extends keyof API, Method extends HTTPMethod> =
  Method extends keyof API[Route] ?
    "queryParams" extends keyof API[Route][Method] ?
      API[Route][Method]["queryParams"]
    : undefined
  : undefined;

export type APIPathParams<Route extends keyof API, Method extends HTTPMethod> =
  Method extends keyof API[Route] ?
    "pathParams" extends keyof API[Route][Method] ?
      API[Route][Method]["pathParams"]
    : undefined
  : undefined;

export type APIBody<Route extends keyof API, Method extends HTTPMethod> =
  Method extends keyof API[Route] ?
    "body" extends keyof API[Route][Method] ?
      API[Route][Method]["body"]
    : undefined
  : undefined;
