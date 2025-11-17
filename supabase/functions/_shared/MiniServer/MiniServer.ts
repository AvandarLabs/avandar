import { z, ZodError } from "npm:zod@4";
import { corsHeaders } from "../cors.ts";
import { BAD_REQUEST, INTERNAL_SERVER_ERROR } from "../httpCodes.ts";
import { createSupabaseClient } from "../supabase.ts";
import {
  parseURLPathParams,
  ValidPathParamsSchema,
  ValidPathParamsSchemaShape,
} from "./parseURLPathParams.ts";
import { isRedirect } from "./redirect.ts";
import { responseError } from "./responseError.ts";
import { responseSuccess } from "./responseSuccess.ts";
import type { Database } from "../../../../src/types/database.types.ts";
import type {
  AnyValidPathParamsRecord,
  GenericAPITypeDef,
  GenericRouteAPIRecord,
  HTTPMethod,
  UnknownRecord,
  URLPathPattern,
  ValidPathParams,
  ValidReturnType,
} from "./api.types.ts";
import type { SupabaseClient, User } from "npm:@supabase/supabase-js@2";
import type { ZodNever, ZodObject } from "npm:zod@4";

/**
 * A valid query value schema must always be a string input (or null/undefined)
 * but it can be transformed to any type.
 */
type QueryParamValueSchema<T> = z.ZodType<T, string | null | undefined>;

type URLPathWithoutParams<Path extends URLPathPattern> =
  Path extends `${string}:${string}` ? never : Path;
type ValidQueryParams = UnknownRecord;

type MakeOptionalIfUndefined<T> = {
  [K in keyof T as undefined extends T[K] ? K : never]?: T[K];
} & {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
};

type QueryParamsSchemaShape<QueryParams extends ValidQueryParams> =
  MakeOptionalIfUndefined<{
    [K in keyof QueryParams]: QueryParamValueSchema<QueryParams[K]>;
  }>;

type QueryParamsSchema<QueryParams extends ValidQueryParams | undefined> =
  QueryParams extends ValidQueryParams ?
    ZodObject<QueryParamsSchemaShape<QueryParams>>
  : undefined;

/**
 * These are the parameters that will get passed into an HTTP handler
 * function.
 */
type HTTPMethodActionFnParams<
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
  : SupabaseClient<Database>;
  user: IsJWTVerificationDisabled extends true ? undefined : User;
};

type HTTPMethodActionFn<
  PathParams extends AnyValidPathParamsRecord | undefined,
  QueryParams extends ValidQueryParams | undefined,
  Body = never,
  IsJWTVerificationDisabled extends boolean = false,
  ReturnType = unknown,
> = (
  params: HTTPMethodActionFnParams<
    PathParams,
    QueryParams,
    Body,
    IsJWTVerificationDisabled
  >,
) => Promise<ReturnType> | ReturnType;

const actionNotImplemented = <
  PathParams extends AnyValidPathParamsRecord | undefined,
  QueryParams extends ValidQueryParams | undefined,
  Body = never,
  IsJWTVerificationDisabled extends boolean = false,
  ReturnType extends ValidReturnType = UnknownRecord,
>(
  _params: HTTPMethodActionFnParams<
    PathParams,
    QueryParams,
    Body,
    IsJWTVerificationDisabled
  >,
): ReturnType => {
  throw new Error("Not implemented");
};

function parseSearchParamsFromURL<
  QParamsSchema extends QueryParamsSchema<ValidQueryParams | undefined>,
>(
  url: string,
  queryParamsSchema: QParamsSchema,
): z.infer<QParamsSchema> | undefined {
  const urlObj = new URL(url);
  const searchParams = urlObj.searchParams;

  try {
    if (searchParams.size === 0) {
      if (queryParamsSchema === undefined) {
        return undefined;
      }
      throw new Error(
        "Expected to receive query params, but none were passed.",
      );
    }

    return queryParamsSchema?.parse(Object.fromEntries(searchParams)) as
      | z.infer<QParamsSchema>
      | undefined;
  } catch (error) {
    const baseMessage = "Error parsing query params";
    if (error instanceof ZodError) {
      throw new Error(`${baseMessage}\n${z.prettifyError(error)}`);
    }
    if (error instanceof Error) {
      throw new Error(`${baseMessage}: ${String(error.message)}`);
    }
    throw new Error(`${baseMessage}: ${String(error)}`);
  }
}

async function parseBodyParams<Body extends z.ZodTypeAny>(
  req: Request,
  bodySchema: Body,
): Promise<z.infer<Body>> {
  try {
    const reqBody = await req.json();
    return bodySchema.parse(reqBody);
  } catch (error) {
    const baseMessage = "Error parsing body params";
    if (error instanceof ZodError) {
      throw new Error(`${baseMessage}. ${z.prettifyError(error)}`);
    }
    if (error instanceof Error) {
      throw new Error(`${baseMessage}: ${String(error.message)}`);
    }
    throw new Error(`${baseMessage}: ${String(error)}`);
  }
}

type ServerRouteHandler<
  Method extends HTTPMethod,
  Path extends URLPathPattern,
  ReturnType extends ValidReturnType,
  PathParams extends ValidPathParams<Path> | undefined,
  QueryParams extends ValidQueryParams | undefined,
  BodySchema extends z.ZodTypeAny,
  IsJWTVerificationDisabled extends boolean,
> = {
  state: {
    method: Method;
    path: Path;
    action: HTTPMethodActionFn<
      PathParams,
      QueryParams,
      z.infer<BodySchema>,
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
     * A GET request will always have this as `z.never()`
     *
     * For other types of requests, if no body schema is specified, it will
     * default to `z.record(z.string(), z.never())` (i.e. an empty record).
     */
    bodySchema: BodySchema;

    /**
     * This should only be set to `true` if the edge function has JWT
     * verification disabled.
     * @default false
     */
    isJWTVerificationDisabled: IsJWTVerificationDisabled;
  };

  // setter methods
  bodySchema: <T extends z.ZodTypeAny>(
    bodySchema: T,
  ) => ServerRouteHandler<
    Method,
    Path,
    ReturnType,
    PathParams,
    QueryParams,
    T,
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
    MakeOptionalIfUndefined<z.infer<ZodObject<NewQueryParamsSchemaShape>>>,
    BodySchema,
    IsJWTVerificationDisabled
  >;

  /**
   * Sets the action to be called when the edge function is called.
   *
   * **IMPORTANT**: This function **must** be called at the end of the
   * configuration chain.
   *
   * @returns The updated server handler.
   */
  action: <NewReturnType extends ValidReturnType>(
    action: HTTPMethodActionFn<
      PathParams,
      QueryParams,
      z.infer<BodySchema>,
      IsJWTVerificationDisabled,
      NewReturnType
    >,
  ) => ServerRouteHandler<
    Method,
    Path,
    NewReturnType,
    PathParams,
    QueryParams,
    BodySchema,
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
    BodySchema,
    true
  >;
};

function createGetHandler<
  Path extends URLPathPattern,
  ReturnType extends ValidReturnType,
  PathParams extends ValidPathParams<Path> | undefined,
  QueryParams extends ValidQueryParams | undefined,
  IsJWTVerificationDisabled extends boolean = false,
>(
  state: ServerRouteHandler<
    "GET",
    Path,
    ReturnType,
    PathParams,
    QueryParams,
    z.ZodNever,
    IsJWTVerificationDisabled
  >["state"],
): ServerRouteHandler<
  "GET",
  Path,
  ReturnType,
  PathParams,
  QueryParams,
  z.ZodNever,
  IsJWTVerificationDisabled
> {
  return {
    state,
    bodySchema: () => {
      throw new Error("GET methods do not support changing the body schema");
    },
    querySchema: <
      NewQueryParamsSchemaShape extends
        QueryParamsSchemaShape<ValidQueryParams>,
    >(
      newQueryParamsSchemaShape: NewQueryParamsSchemaShape,
    ): ServerRouteHandler<
      "GET",
      Path,
      ReturnType,
      PathParams,
      MakeOptionalIfUndefined<z.infer<ZodObject<NewQueryParamsSchemaShape>>>,
      ZodNever,
      IsJWTVerificationDisabled
    > => {
      return createGetHandler({
        ...state,

        /* eslint-disable @typescript-eslint/no-explicit-any */
        // deno-lint-ignore no-explicit-any
        querySchema: z.object(newQueryParamsSchemaShape) as any,
        /* eslint-enable  @typescript-eslint/no-explicit-any */

        action: actionNotImplemented as HTTPMethodActionFn<
          PathParams,
          MakeOptionalIfUndefined<
            z.infer<ZodObject<NewQueryParamsSchemaShape>>
          >,
          never,
          IsJWTVerificationDisabled,
          ReturnType
        >, // reset the action
      });
    },
    disableJWTVerification: (): ServerRouteHandler<
      "GET",
      Path,
      ReturnType,
      PathParams,
      QueryParams,
      z.ZodNever,
      true
    > => {
      return createGetHandler({
        ...state,
        isJWTVerificationDisabled: true,
        action: actionNotImplemented as HTTPMethodActionFn<
          PathParams,
          QueryParams,
          never,
          true,
          ReturnType
        >, // reset the action
      });
    },
    action: <NewReturnType extends ValidReturnType>(
      action: HTTPMethodActionFn<
        PathParams,
        QueryParams,
        never,
        IsJWTVerificationDisabled,
        NewReturnType
      >,
    ): ServerRouteHandler<
      "GET",
      Path,
      NewReturnType,
      PathParams,
      QueryParams,
      z.ZodNever,
      IsJWTVerificationDisabled
    > => {
      return createGetHandler({ ...state, action });
    },
  };
}

function createPostHandler<
  Path extends URLPathPattern,
  ReturnType extends ValidReturnType,
  PathParams extends ValidPathParams<Path> | undefined,
  QueryParams extends ValidQueryParams | undefined,
  BodySchema extends z.ZodTypeAny = z.ZodUndefined,
  IsJWTVerificationDisabled extends boolean = false,
>(
  state: ServerRouteHandler<
    "POST",
    Path,
    ReturnType,
    PathParams,
    QueryParams,
    BodySchema,
    IsJWTVerificationDisabled
  >["state"],
): ServerRouteHandler<
  "POST",
  Path,
  ReturnType,
  PathParams,
  QueryParams,
  BodySchema,
  IsJWTVerificationDisabled
> {
  return {
    state,
    bodySchema: <NewBodySchema extends z.ZodTypeAny>(
      newBodySchema: NewBodySchema,
    ): ServerRouteHandler<
      "POST",
      Path,
      ReturnType,
      PathParams,
      QueryParams,
      NewBodySchema,
      IsJWTVerificationDisabled
    > => {
      return createPostHandler({
        ...state,
        bodySchema: newBodySchema,
        action: actionNotImplemented as HTTPMethodActionFn<
          PathParams,
          QueryParams,
          z.infer<NewBodySchema>,
          IsJWTVerificationDisabled,
          ReturnType
        >, // reset the action
      });
    },
    querySchema: <
      NewQueryParamsSchemaShape extends
        QueryParamsSchemaShape<ValidQueryParams>,
    >(
      newQueryParamsSchemaShape: NewQueryParamsSchemaShape,
    ): ServerRouteHandler<
      "POST",
      Path,
      ReturnType,
      PathParams,
      MakeOptionalIfUndefined<z.infer<ZodObject<NewQueryParamsSchemaShape>>>,
      BodySchema,
      IsJWTVerificationDisabled
    > => {
      return createPostHandler({
        ...state,

        /* eslint-disable @typescript-eslint/no-explicit-any */
        // deno-lint-ignore no-explicit-any
        querySchema: z.object(newQueryParamsSchemaShape) as any,
        /* eslint-enable  @typescript-eslint/no-explicit-any */

        action: actionNotImplemented as HTTPMethodActionFn<
          PathParams,
          MakeOptionalIfUndefined<
            z.infer<ZodObject<NewQueryParamsSchemaShape>>
          >,
          z.infer<BodySchema>,
          IsJWTVerificationDisabled,
          ReturnType
        >, // reset the action
      });
    },
    disableJWTVerification: (): ServerRouteHandler<
      "POST",
      Path,
      ReturnType,
      PathParams,
      QueryParams,
      BodySchema,
      true
    > => {
      return createPostHandler({
        ...state,
        isJWTVerificationDisabled: true,
        action: actionNotImplemented as HTTPMethodActionFn<
          PathParams,
          QueryParams,
          z.infer<BodySchema>,
          true,
          ReturnType
        >, // reset the action
      });
    },
    action: <NewReturnType extends ValidReturnType>(
      action: HTTPMethodActionFn<
        PathParams,
        QueryParams,
        z.infer<BodySchema>,
        IsJWTVerificationDisabled,
        NewReturnType
      >,
    ): ServerRouteHandler<
      "POST",
      Path,
      NewReturnType,
      PathParams,
      QueryParams,
      BodySchema,
      IsJWTVerificationDisabled
    > => {
      return createPostHandler({ ...state, action });
    },
  };
}

export function GET<
  Path extends URLPathPattern,
  ReturnType extends ValidReturnType,
>(): ServerRouteHandler<
  "GET",
  "/",
  ReturnType,
  undefined,
  undefined,
  z.ZodNever,
  false
>;
export function GET<
  Path extends URLPathPattern,
  ReturnType extends ValidReturnType,
>(
  path: URLPathWithoutParams<Path>,
): ServerRouteHandler<
  "GET",
  Path,
  ReturnType,
  undefined,
  undefined,
  z.ZodNever,
  false
>;
export function GET<
  Path extends URLPathPattern,
  ReturnType extends ValidReturnType,
  PathParams extends ValidPathParams<Path>,
>(options: {
  path: Path;
  schema: ValidPathParamsSchemaShape<PathParams>;
}): ServerRouteHandler<
  "GET",
  Path,
  ReturnType,
  PathParams,
  undefined,
  z.ZodNever,
  false
>;
export function GET<
  Path extends URLPathPattern,
  ReturnType extends ValidReturnType,
  PathParams extends ValidPathParams<Path>,
>(
  path:
    | Path
    | {
        path: Path;
        schema: ValidPathParamsSchemaShape<PathParams>;
      } = "/" as Path,
): ServerRouteHandler<
  "GET",
  Path,
  ReturnType,
  PathParams,
  undefined,
  z.ZodNever,
  false
> {
  const pathSchemaShape =
    typeof path === "object" && "schema" in path ? path.schema : undefined;

  return createGetHandler({
    method: "GET",
    path: typeof path === "string" ? path : path.path,
    pathParamsSchema: (pathSchemaShape ?
      z.object(pathSchemaShape)
    : undefined) as ValidPathParamsSchema<PathParams>,
    querySchema: undefined,
    bodySchema: z.never(),
    action: actionNotImplemented as HTTPMethodActionFn<
      AnyValidPathParamsRecord | undefined,
      undefined,
      never,
      false,
      ReturnType
    >,
    isJWTVerificationDisabled: false,
  });
}

export function POST<
  Path extends URLPathPattern,
  ReturnType extends ValidReturnType,
>(): ServerRouteHandler<
  "POST",
  "/",
  ReturnType,
  undefined,
  undefined,
  z.ZodRecord<z.ZodString, z.ZodNever>,
  false
>;
export function POST<
  Path extends URLPathPattern,
  ReturnType extends ValidReturnType,
>(
  path: URLPathWithoutParams<Path>,
): ServerRouteHandler<
  "POST",
  Path,
  ReturnType,
  undefined,
  undefined,
  z.ZodRecord<z.ZodString, z.ZodNever>,
  false
>;
export function POST<
  Path extends URLPathPattern,
  ReturnType extends ValidReturnType,
  PathParams extends ValidPathParams<Path>,
>(options: {
  path: Path;
  schema: ValidPathParamsSchemaShape<PathParams>;
}): ServerRouteHandler<
  "POST",
  Path,
  ReturnType,
  PathParams,
  undefined,
  z.ZodRecord<z.ZodString, z.ZodNever>,
  false
>;
export function POST<
  Path extends URLPathPattern,
  ReturnType extends ValidReturnType,
  PathParams extends ValidPathParams<Path> | undefined,
>(
  path:
    | Path
    | {
        path: Path;
        schema: ValidPathParamsSchemaShape<PathParams>;
      } = "/" as Path,
): ServerRouteHandler<
  "POST",
  Path,
  ReturnType,
  PathParams,
  undefined,
  z.ZodRecord<z.ZodString, z.ZodNever>,
  false
> {
  const pathSchemaShape =
    typeof path === "object" && "schema" in path ? path.schema : undefined;

  return createPostHandler({
    method: "POST",
    path: typeof path === "string" ? path : path.path,
    pathParamsSchema: (pathSchemaShape ?
      z.object(pathSchemaShape)
    : undefined) as ValidPathParamsSchema<PathParams>,
    querySchema: undefined,
    bodySchema: z.record(z.string(), z.never()),
    action: actionNotImplemented as HTTPMethodActionFn<
      AnyValidPathParamsRecord | undefined,
      undefined,
      Record<string, never>,
      false,
      ReturnType
    >,
    isJWTVerificationDisabled: false,
  });
}

async function getSupabaseClientAndUser(request: Request): Promise<{
  supabaseClient: SupabaseClient<Database>;
  user: User;
}> {
  const supabaseClient = createSupabaseClient(request);
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  const {
    data: { user },
  } = await supabaseClient.auth.getUser(token);

  if (!user) {
    throw new Error("User not found");
  }

  return {
    supabaseClient,
    user,
  };
}

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
          Method extends "GET" ? z.ZodNever : z.ZodTypeAny,
          boolean
        >
      : never;
    }
  : never;
};

export type MiniServerAPIDef<API extends GenericAPITypeDef> = {
  [FnName in keyof API]: MiniServerRoutesDef<API[FnName]>;
};

/**
 * This function is used to ensure that the routes are consistent with the
 * manually-defined API type.
 *
 * All this function does is attach the routes to the function name and build
 * a new object. The primary purpose of this function is for type-checking.
 *
 * @param routesAPI - The API route definitions.
 * @returns The routes to be passed into the `MiniServer` function.
 */
export function defineRoutes<T extends GenericAPITypeDef>(
  functionName: keyof T,
  routesAPI: MiniServerRoutesDef<T[keyof T]>,
): MiniServerAPIDef<T> {
  return { [functionName]: routesAPI } as MiniServerAPIDef<T>;
}

/**
 * A small server that returns a `serve()` function which wraps the
 * `Deno.serve()` function.
 *
 * This MiniServer handles:
 * - Routing
 * - Parsing query params
 * - Providing the authenticated user and Supabase client to request handlers
 * - Adding CORS headers and handling OPTIONS requests from browsers
 */
export function MiniServer<API extends GenericRouteAPIRecord>(
  routeAPI: MiniServerAPIDef<API>,
): { serve: () => void } {
  const functionNames = Object.keys(routeAPI);
  if (functionNames.length > 1) {
    throw new Error(
      "Only one function name is allowed. All routes should be nested under it.",
    );
  }
  const functionName = functionNames[0];

  const routeHandlers = routeAPI[functionName as keyof typeof routeAPI];
  const routeNames = Object.keys(routeHandlers);
  if (routeNames.length === 0) {
    throw new Error("At least one route is required.");
  }

  return {
    serve: () => {
      Deno.serve(
        async (req: Request, info: Deno.ServeHandlerInfo<Deno.NetAddr>) => {
          // This is needed for functions invoked from a browser.
          if (req.method === "OPTIONS") {
            return new Response("ok", { headers: corsHeaders });
          }

          try {
            let handler = undefined;
            let pathParams = {} as AnyValidPathParamsRecord;

            for (const routeName of routeNames) {
              const methodHandlers =
                routeHandlers[routeName as keyof typeof routeHandlers];
              const h =
                methodHandlers[req.method as keyof typeof methodHandlers];

              if (h.state.method === req.method) {
                const parsedPathParams = parseURLPathParams({
                  pattern: `/${functionName}${h.state.path}`,
                  url: req.url,

                  /* eslint-disable @typescript-eslint/no-explicit-any */
                  // deno-lint-ignore no-explicit-any
                  paramSchema: h.state.pathParamsSchema as any,
                  /* eslint-enable @typescript-eslint/no-explicit-any */
                });

                if (parsedPathParams.success) {
                  handler = h;
                  pathParams =
                    parsedPathParams.params as AnyValidPathParamsRecord;
                  break;
                }
              }
            }

            if (handler) {
              const {
                action,
                querySchema,
                bodySchema,
                isJWTVerificationDisabled,
              } = (
                handler as unknown as ServerRouteHandler<
                  HTTPMethod,
                  URLPathPattern,
                  ValidReturnType,
                  AnyValidPathParamsRecord | undefined,
                  ValidQueryParams | undefined,
                  z.ZodTypeAny,
                  boolean
                >
              ).state;

              const { supabaseClient, user } =
                isJWTVerificationDisabled ?
                  {}
                : await getSupabaseClientAndUser(req);

              const queryParams = parseSearchParamsFromURL(
                req.url,
                querySchema,
              ) as ValidQueryParams | undefined;
              if (req.method === "GET") {
                const response = await action({
                  body: undefined,
                  request: req,
                  info,
                  supabaseClient,
                  user,
                  queryParams,
                  pathParams,
                });
                return response instanceof Response ? response : (
                    responseSuccess(response)
                  );
              }
              const body = await parseBodyParams(req, bodySchema);
              const response = await action({
                body,
                request: req,
                info,
                supabaseClient,
                user,
                pathParams,
                queryParams,
              });
              return response instanceof Response ? response : (
                  responseSuccess(response)
                );
            }

            return responseError("Method not allowed", BAD_REQUEST);
          } catch (error) {
            if (isRedirect(error)) {
              return error.response;
            }
            return responseError(error, INTERNAL_SERVER_ERROR);
          }
        },
      );
    },
  };
}
