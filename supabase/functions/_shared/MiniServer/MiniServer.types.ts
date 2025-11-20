import type { AvaSupabaseClient } from "../supabase.ts";
import type {
  AnyValidPathParamsRecord,
  GenericAPITypeDef,
  GenericRouteAPIRecord,
  HTTPMethod,
  UnknownRecord,
  URLPathPattern,
  ValidBody,
  ValidPathParams,
  ValidReturnType,
} from "./api.types.ts";
import type { AnyZodType } from "./createServerRouteHandler.ts";
import type { ValidPathParamsSchema } from "./parseURLPathParams.ts";
import type { User } from "npm:@supabase/supabase-js@2";
import type { infer as ZodInfer, ZodObject, ZodType } from "npm:zod@4";

export type ValidBodySchema = AnyZodType | Record<string, AnyZodType>;
export type InferBody<T extends ValidBodySchema> =
  T extends AnyZodType ? ZodInfer<T>
  : {
      [K in keyof T]: ZodInfer<T[K]>;
    };
/**
 * A valid query value schema must always be a string input (or null/undefined)
 * but it can be transformed to any type.
 */
type QueryParamValueSchema<T> = ZodType<T, string | null | undefined>;

export type MakeOptionalIfUndefined<T> = {
  [K in keyof T as undefined extends T[K] ? K : never]?: T[K];
} & {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
};

export type ValidQueryParams = UnknownRecord;

export type URLPathWithoutParams<Path extends URLPathPattern> =
  Path extends `${string}:${string}` ? never : Path;

export type QueryParamsSchemaShape<QueryParams extends ValidQueryParams> =
  MakeOptionalIfUndefined<{
    [K in keyof QueryParams]: QueryParamValueSchema<QueryParams[K]>;
  }>;

export type QueryParamsSchema<
  QueryParams extends ValidQueryParams | undefined,
> =
  QueryParams extends ValidQueryParams ?
    ZodObject<QueryParamsSchemaShape<QueryParams>>
  : undefined;

/**
 * These are the parameters that will get passed into an HTTP handler
 * function.
 */
export type HTTPMethodActionFnOptions<
  URLParams extends UnknownRecord | undefined,
  QueryParams extends ValidQueryParams | undefined,
  Body,
  IsJWTVerificationDisabled extends boolean = false,
> = {
  /**
   * URL params are parameters extracted from the URL path.
   *
   * For example, in the following URL:
   * `/path/:id/morePath/:name`
   *
   * `pathParams` will be an object with the following keys:
   * `{ id: string, name: string }`
   */
  pathParams: URLParams;

  /**
   * Query params are parameters extracted from the URL query string,
   * which is everything after the `?` in the URL.
   *
   * For example, in the following URL:
   * `/path?queryParam1=value1&queryParam2=value2`
   *
   * `queryParams` will be an object with the following keys:
   * `{ queryParam1: string, queryParam2: string }`
   */
  queryParams: QueryParams;
  body: Body;
  request: Request;
  info: Deno.ServeHandlerInfo<Deno.NetAddr>;
  supabaseClient: IsJWTVerificationDisabled extends true ? undefined
  : AvaSupabaseClient;
  supabaseAdminClient: AvaSupabaseClient;
  user: IsJWTVerificationDisabled extends true ? undefined : User;
};

export type HTTPMethodActionFn<
  PathParams extends AnyValidPathParamsRecord | undefined,
  QueryParams extends ValidQueryParams | undefined,
  Body extends ValidBody = undefined,
  IsJWTVerificationDisabled extends boolean = false,
  ReturnType = unknown,
> = (
  params: HTTPMethodActionFnOptions<
    PathParams,
    QueryParams,
    Body,
    IsJWTVerificationDisabled
  >,
) => Promise<ReturnType> | ReturnType;

export type ServerRouteHandler<
  Method extends HTTPMethod,
  Path extends URLPathPattern,
  ReturnType extends ValidReturnType,
  PathParams extends ValidPathParams<Path> | undefined,
  QueryParams extends ValidQueryParams | undefined,
  Body extends ValidBody,
  IsJWTVerificationDisabled extends boolean,
> = {
  state: {
    method: Method;
    path: Path;
    action: HTTPMethodActionFn<
      PathParams,
      QueryParams,
      Body,
      IsJWTVerificationDisabled,
      ReturnType
    >;

    /**
     * The path schema for the request. This is used to validate the request
     * path pattern.
     *
     * A pattern is of the format `/path/:param1/morePath/:param2`
     *
     * @default undefined (if there are no path params set)
     */
    pathParamsSchema: ValidPathParamsSchema<PathParams>;

    /**
     * The query params schema for the request. THis is used to validate
     * the parameters in the URL query string. i.e. everything after the
     * `?` in the URL.
     *
     * For example, in the following URL:
     * `/path/:id?queryParam1=value1&queryParam2=value2`
     *
     * `queryParam1` and `queryParam2` are the query parameters.
     *
     * @default undefined (if no query params are set)
     */
    querySchema: QueryParamsSchema<QueryParams>;

    /**
     * The body schema for the request. This is used to validate the request
     * body.
     *
     * A GET request will always have this as `z.undefined()`
     *
     * For other types of requests, if no body schema is specified, it will
     * default to `z.record(z.string(), z.never())` (i.e. an empty record).
     */
    /* eslint-disable @typescript-eslint/no-explicit-any */
    // deno-lint-ignore no-explicit-any
    bodySchema: ZodType<Body, any>;
    /* eslint-enable @typescript-eslint/no-explicit-any */

    /**
     * This should only be set to `true` if the edge function has JWT
     * verification disabled.
     * @default false
     */
    isJWTVerificationDisabled: IsJWTVerificationDisabled;
  };

  // setter methods
  bodySchema: <T extends ValidBodySchema>(
    bodySchema: T,
  ) => ServerRouteHandler<
    Method,
    Path,
    ReturnType,
    PathParams,
    QueryParams,
    InferBody<T>,
    IsJWTVerificationDisabled
  >;

  querySchema: <
    NewQueryParamsSchemaShape extends QueryParamsSchemaShape<ValidQueryParams>,
  >(
    queryParamsSchemaShape: NewQueryParamsSchemaShape,
  ) => ServerRouteHandler<
    Method,
    Path,
    ReturnType,
    PathParams,
    MakeOptionalIfUndefined<ZodInfer<ZodObject<NewQueryParamsSchemaShape>>>,
    Body,
    IsJWTVerificationDisabled
  >;

  /**
   * Sets the action to be called when the edge function is called.
   *
   * **IMPORTANT**: This function **must** be called at the end of the
   * configuration chain.
   *
   * If you have a GET request and need to return a redirect, you can use:
   *
   * ```ts
   * import { redirect } from '../_shared/redirect';
   *
   * GET('/').action(() => {
   *   throw redirect(url);
   * });
   * ```
   *
   * The MiniServer will catch the redirect and return the appropriate HTTP
   * redirect Response object.
   *
   * @returns The updated server handler.
   */
  action: <NewReturnType extends ValidReturnType>(
    action: HTTPMethodActionFn<
      PathParams,
      QueryParams,
      Body,
      IsJWTVerificationDisabled,
      NewReturnType
    >,
  ) => ServerRouteHandler<
    Method,
    Path,
    NewReturnType,
    PathParams,
    QueryParams,
    Body,
    IsJWTVerificationDisabled
  >;

  /**
   * This function **must** be called for an edge function that has been
   * configured to disable JWT verification.
   */
  disableJWTVerification: () => ServerRouteHandler<
    Method,
    Path,
    ReturnType,
    PathParams,
    QueryParams,
    Body,
    true
  >;
};

export type MiniServerRoutesDef<RoutesAPI extends GenericRouteAPIRecord> = {
  [RouteName in keyof RoutesAPI]: RouteName extends `/${string}` ?
    {
      [Method in Extract<
        keyof RoutesAPI[RouteName],
        HTTPMethod
      >]: RoutesAPI[RouteName][Method] extends object ?
        ServerRouteHandler<
          Method,
          RouteName,
          RoutesAPI[RouteName][Method]["returnType"],
          RoutesAPI[RouteName][Method]["pathParams"] extends object ?
            RoutesAPI[RouteName][Method]["pathParams"]
          : undefined,
          RoutesAPI[RouteName][Method]["queryParams"] extends object ?
            RoutesAPI[RouteName][Method]["queryParams"]
          : undefined,
          Method extends "GET" ? undefined
          : "body" extends keyof RoutesAPI[RouteName][Method] ?
            RoutesAPI[RouteName][Method]["body"]
          : Record<string, never>,
          boolean
        >
      : never;
    }
  : never;
};

export type MiniServerAPIDef<API extends GenericAPITypeDef> = {
  [FnName in keyof API]: MiniServerRoutesDef<API[FnName]>;
};
