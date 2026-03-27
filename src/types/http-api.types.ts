import type { GoogleAuthCallbackAPI } from "@sbfn/google-auth-callback/google-auth-callback.types";
import type { GoogleAuthAPI } from "@sbfn/google-auth/google-auth.types";
import type { GoogleSheetsAPI } from "@sbfn/google-sheets/google-sheets.types";
import type { HealthAPI } from "@sbfn/health/health.types";
import type { PolarPublicAPI } from "@sbfn/polar-public/polar-public.types";
import type { QueriesAPI } from "@sbfn/queries/queries.types";
import type { SubscriptionsAPI } from "@sbfn/subscriptions/subscriptions.routes.types";
import type { WaitlistAPI } from "@sbfn/waitlist/waitlist.types";
import type { WorkspacesAPI } from "@sbfn/workspaces/workspaces.routes.types";
import type { Simplify } from "type-fest";

export type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

/**
 * Any new APIs that get added to the supabase/functions directory should
 * be added here.
 */
type FullAPI = HealthAPI &
  QueriesAPI &
  WorkspacesAPI &
  GoogleAuthAPI &
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
