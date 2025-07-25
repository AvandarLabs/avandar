import { z, ZodError } from "npm:zod@4";
import { corsHeaders } from "../cors.ts";
import { BAD_REQUEST, INTERNAL_SERVER_ERROR } from "../httpCodes.ts";
import { createSupabaseClient } from "../supabase.ts";
import {
  DefaultPathSchema,
  parseURLPatternParams,
  ValidURLParamsSchema,
  ValidURLParamsSchemaShape,
} from "./parseURLPatternParams.ts";
import { isRedirect } from "./redirect.ts";
import { responseError } from "./responseError.ts";
import { responseSuccess } from "./responseSuccess.ts";
import type { Database } from "../../../../src/types/database.types.ts";
import type { APITypeStruct, ValidReturnType } from "./api.types.ts";
import type { SupabaseClient, User } from "npm:@supabase/supabase-js@2";

type UnknownRecord = Record<string, unknown>;
type HTTPMethod = "POST" | "GET" | "PUT" | "DELETE";
type URLPathPattern = `/${string}`;
type ValidQueryParamsSchemaShape = Record<string, z.ZodTypeAny>;
type URLPathWithoutParams<Path extends URLPathPattern> =
  Path extends `${string}:${string}` ? never : Path;
type ValidQueryParamsSchema =
  | z.ZodObject<ValidQueryParamsSchemaShape>
  | z.ZodRecord<z.ZodString, z.ZodTypeAny>
  | z.ZodUndefined;

/**
 * These are the parameters that will get passed into an HTTP handler
 * function.
 */
type HTTPMethodActionFnParams<
  URLParams extends UnknownRecord | undefined,
  QueryParams extends UnknownRecord | undefined,
  Body,
  IsJWTVerificationDisabled extends boolean = false,
> = {
  urlParams: URLParams;
  queryParams: QueryParams;
  body: Body;
  request: Request;
  info: Deno.ServeHandlerInfo<Deno.NetAddr>;
  supabaseClient: IsJWTVerificationDisabled extends true ? undefined
  : SupabaseClient<Database>;
  user: IsJWTVerificationDisabled extends true ? undefined : User;
};

type HTTPMethodActionFn<
  URLParams extends UnknownRecord | undefined,
  QueryParams extends UnknownRecord | undefined,
  Body,
  IsJWTVerificationDisabled extends boolean = false,
  ReturnType = unknown,
> = (
  params: HTTPMethodActionFnParams<
    URLParams,
    QueryParams,
    Body,
    IsJWTVerificationDisabled
  >,
) => Promise<ReturnType> | ReturnType;

const actionNotImplemented = <
  URLParams extends UnknownRecord | undefined,
  QueryParams extends UnknownRecord | undefined,
  Body,
  IsJWTVerificationDisabled extends boolean = false,
  ReturnType extends ValidReturnType = UnknownRecord,
>(
  _params: HTTPMethodActionFnParams<
    URLParams,
    QueryParams,
    Body,
    IsJWTVerificationDisabled
  >,
): ReturnType => {
  throw new Error("Not implemented");
};

function parseSearchParamsFromURL<
  QueryParamsSchema extends ValidQueryParamsSchema,
>(
  url: string,
  queryParamsSchema: QueryParamsSchema,
): z.infer<QueryParamsSchema> | undefined {
  const urlObj = new URL(url);
  const searchParams = urlObj.searchParams;

  try {
    if (searchParams.size === 0) {
      if (queryParamsSchema.def.type === "undefined") {
        return undefined;
      }
      throw new Error(
        "Expected to receive query params, but none were passed.",
      );
    }

    return queryParamsSchema.parse(
      Object.fromEntries(searchParams),
    ) as z.infer<QueryParamsSchema>;
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
  URLParamsSchema extends ValidURLParamsSchema<Path>,
  QueryParamsSchema extends ValidQueryParamsSchema,
  BodySchema extends z.ZodTypeAny,
  IsJWTVerificationDisabled extends boolean,
> = {
  state: {
    method: Method;
    path: Path;
    action: HTTPMethodActionFn<
      z.infer<URLParamsSchema>,
      z.infer<QueryParamsSchema>,
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
     * @default z.ZodRecord<z.ZodString, z.ZodString>
     */
    pathParamsSchema: URLParamsSchema;

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
     * @default z.ZodUndefined
     */
    querySchema: QueryParamsSchema;

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
    URLParamsSchema,
    QueryParamsSchema,
    T,
    IsJWTVerificationDisabled
  >;

  querySchema: <T extends ValidQueryParamsSchemaShape>(
    querySchema: T,
  ) => ServerRouteHandler<
    Method,
    Path,
    ReturnType,
    URLParamsSchema,
    z.ZodObject<T>,
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
      z.infer<URLParamsSchema>,
      z.infer<QueryParamsSchema>,
      z.infer<BodySchema>,
      IsJWTVerificationDisabled,
      NewReturnType
    >,
  ) => ServerRouteHandler<
    Method,
    Path,
    NewReturnType,
    URLParamsSchema,
    QueryParamsSchema,
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
    URLParamsSchema,
    QueryParamsSchema,
    BodySchema,
    true
  >;
};

function createGetHandler<
  Path extends URLPathPattern,
  ReturnType extends ValidReturnType,
  URLParamsSchema extends ValidURLParamsSchema<Path>,
  QueryParamsSchema extends ValidQueryParamsSchema,
  IsJWTVerificationDisabled extends boolean = false,
>(
  state: ServerRouteHandler<
    "GET",
    Path,
    ReturnType,
    URLParamsSchema,
    QueryParamsSchema,
    z.ZodNever,
    IsJWTVerificationDisabled
  >["state"],
): ServerRouteHandler<
  "GET",
  Path,
  ReturnType,
  URLParamsSchema,
  QueryParamsSchema,
  z.ZodNever,
  IsJWTVerificationDisabled
> {
  return {
    state,
    bodySchema: () => {
      throw new Error("GET methods do not support changing the body schema");
    },
    querySchema: <
      NewQueryParamsSchemaShape extends ValidQueryParamsSchemaShape,
    >(
      newQueryParamsSchema: NewQueryParamsSchemaShape,
    ): ServerRouteHandler<
      "GET",
      Path,
      ReturnType,
      URLParamsSchema,
      z.ZodObject<NewQueryParamsSchemaShape>,
      z.ZodNever,
      IsJWTVerificationDisabled
    > => {
      return createGetHandler({
        ...state,
        querySchema: z.object(newQueryParamsSchema),
        action: actionNotImplemented as HTTPMethodActionFn<
          z.infer<URLParamsSchema>,
          z.infer<z.ZodObject<NewQueryParamsSchemaShape>>,
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
      URLParamsSchema,
      QueryParamsSchema,
      z.ZodNever,
      true
    > => {
      return createGetHandler({
        ...state,
        isJWTVerificationDisabled: true,
        action: actionNotImplemented as HTTPMethodActionFn<
          z.infer<URLParamsSchema>,
          z.infer<QueryParamsSchema>,
          never,
          true,
          ReturnType
        >, // reset the action
      });
    },
    action: <NewReturnType extends ValidReturnType>(
      action: HTTPMethodActionFn<
        z.infer<URLParamsSchema>,
        z.infer<QueryParamsSchema>,
        never,
        IsJWTVerificationDisabled,
        NewReturnType
      >,
    ): ServerRouteHandler<
      "GET",
      Path,
      NewReturnType,
      URLParamsSchema,
      QueryParamsSchema,
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
  URLParamsSchema extends ValidURLParamsSchema<Path>,
  QueryParamsSchema extends ValidQueryParamsSchema,
  BodySchema extends z.ZodTypeAny = z.ZodUndefined,
  IsJWTVerificationDisabled extends boolean = false,
>(
  state: ServerRouteHandler<
    "POST",
    Path,
    ReturnType,
    URLParamsSchema,
    QueryParamsSchema,
    BodySchema,
    IsJWTVerificationDisabled
  >["state"],
): ServerRouteHandler<
  "POST",
  Path,
  ReturnType,
  URLParamsSchema,
  QueryParamsSchema,
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
      URLParamsSchema,
      QueryParamsSchema,
      NewBodySchema,
      IsJWTVerificationDisabled
    > => {
      return createPostHandler({
        ...state,
        bodySchema: newBodySchema,
        action: actionNotImplemented as HTTPMethodActionFn<
          z.infer<URLParamsSchema>,
          z.infer<QueryParamsSchema>,
          z.infer<NewBodySchema>,
          IsJWTVerificationDisabled,
          ReturnType
        >, // reset the action
      });
    },
    querySchema: <
      NewQueryParamsSchemaShape extends ValidQueryParamsSchemaShape,
    >(
      newQueryParamsSchema: NewQueryParamsSchemaShape,
    ): ServerRouteHandler<
      "POST",
      Path,
      ReturnType,
      URLParamsSchema,
      z.ZodObject<NewQueryParamsSchemaShape>,
      BodySchema,
      IsJWTVerificationDisabled
    > => {
      return createPostHandler({
        ...state,
        querySchema: z.object(newQueryParamsSchema),
        action: actionNotImplemented as HTTPMethodActionFn<
          z.infer<URLParamsSchema>,
          z.infer<z.ZodObject<NewQueryParamsSchemaShape>>,
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
      URLParamsSchema,
      QueryParamsSchema,
      BodySchema,
      true
    > => {
      return createPostHandler({
        ...state,
        isJWTVerificationDisabled: true,
        action: actionNotImplemented as HTTPMethodActionFn<
          z.infer<URLParamsSchema>,
          z.infer<QueryParamsSchema>,
          z.infer<BodySchema>,
          true,
          ReturnType
        >, // reset the action
      });
    },
    action: <NewReturnType extends ValidReturnType>(
      action: HTTPMethodActionFn<
        z.infer<URLParamsSchema>,
        z.infer<QueryParamsSchema>,
        z.infer<BodySchema>,
        IsJWTVerificationDisabled,
        NewReturnType
      >,
    ): ServerRouteHandler<
      "POST",
      Path,
      NewReturnType,
      URLParamsSchema,
      QueryParamsSchema,
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
  z.ZodUndefined,
  z.ZodUndefined,
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
  z.ZodUndefined,
  z.ZodUndefined,
  z.ZodNever,
  false
>;
export function GET<
  Path extends URLPathPattern,
  ReturnType extends ValidReturnType,
>(
  path: Path | { path: Path },
): ServerRouteHandler<
  "GET",
  Path,
  ReturnType,
  DefaultPathSchema<Path>,
  z.ZodUndefined,
  z.ZodNever,
  false
>;
export function GET<
  Path extends URLPathPattern,
  ReturnType extends ValidReturnType,
  URLParamsSchemaShape extends ValidURLParamsSchemaShape<Path>,
>(options: {
  path: Path;
  schema: URLParamsSchemaShape;
}): ServerRouteHandler<
  "GET",
  Path,
  ReturnType,
  z.ZodObject<URLParamsSchemaShape>,
  z.ZodUndefined,
  z.ZodNever,
  false
>;
export function GET<
  Path extends URLPathPattern,
  ReturnType extends ValidReturnType,
  URLParamsSchemaShape extends ValidURLParamsSchemaShape<Path>,
>(
  path:
    | Path
    | {
        path: Path;
        schema?: URLParamsSchemaShape;
      } = "/" as Path,
): ServerRouteHandler<
  "GET",
  Path,
  ReturnType,
  ValidURLParamsSchema<Path>,
  z.ZodUndefined,
  z.ZodNever,
  false
> {
  const pathString = typeof path === "string" ? path : path.path;
  const pathHasParams = pathString.includes(":");

  return createGetHandler({
    method: "GET",
    path: typeof path === "string" ? path : path.path,
    pathParamsSchema:
      typeof path === "object" && "schema" in path ? z.object(path.schema)
      : pathHasParams ? z.record(z.string(), z.string())
      : z.undefined(),
    querySchema: z.undefined(),
    bodySchema: z.never(),
    action: actionNotImplemented as HTTPMethodActionFn<
      Record<string, unknown> | undefined,
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
  z.ZodUndefined,
  z.ZodUndefined,
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
  z.ZodUndefined,
  z.ZodUndefined,
  z.ZodRecord<z.ZodString, z.ZodNever>,
  false
>;
export function POST<
  Path extends URLPathPattern,
  ReturnType extends ValidReturnType,
>(
  path: Path | { path: Path },
): ServerRouteHandler<
  "POST",
  Path,
  ReturnType,
  DefaultPathSchema<Path>,
  z.ZodUndefined,
  z.ZodRecord<z.ZodString, z.ZodNever>,
  false
>;
export function POST<
  Path extends URLPathPattern,
  ReturnType extends ValidReturnType,
  URLParamsSchemaShape extends ValidURLParamsSchemaShape<Path>,
>(options: {
  path: Path;
  schema: URLParamsSchemaShape;
}): ServerRouteHandler<
  "POST",
  Path,
  ReturnType,
  z.ZodObject<URLParamsSchemaShape>,
  z.ZodUndefined,
  z.ZodRecord<z.ZodString, z.ZodNever>,
  false
>;
export function POST<
  Path extends URLPathPattern,
  ReturnType extends ValidReturnType,
  URLParamsSchemaShape extends ValidURLParamsSchemaShape<Path>,
>(
  path:
    | Path
    | { path: Path }
    | { path: Path; schema: URLParamsSchemaShape } = "/" as Path,
): ServerRouteHandler<
  "POST",
  Path,
  ReturnType,
  ValidURLParamsSchema<Path>,
  z.ZodUndefined,
  z.ZodRecord<z.ZodString, z.ZodNever>,
  false
> {
  const pathString = typeof path === "string" ? path : path.path;
  const pathHasParams = pathString.includes(":");

  return createPostHandler({
    method: "POST",
    path: typeof path === "string" ? path : path.path,
    pathParamsSchema:
      typeof path === "object" && "schema" in path ? z.object(path.schema)
      : pathHasParams ? z.record(z.string(), z.string())
      : z.undefined(),
    querySchema: z.undefined(),
    bodySchema: z.record(z.string(), z.never()),
    action: actionNotImplemented as HTTPMethodActionFn<
      Record<string, unknown> | undefined,
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

export type MiniServerRoutesDef<API extends APITypeStruct> = {
  [FnName in keyof API]: {
    [RouteName in keyof API[FnName]]: RouteName extends `/${string}` ?
      ServerRouteHandler<
        HTTPMethod,
        RouteName,
        API[FnName][RouteName]["returnType"],
        ValidURLParamsSchema<RouteName>,
        ValidQueryParamsSchema,
        z.ZodTypeAny,
        boolean
      >
    : never;
  };
};

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
export function MiniServer<API extends APITypeStruct>(
  routeAPI: MiniServerRoutesDef<API>,
): { serve: () => void } {
  const functionNames = Object.keys(routeAPI);
  if (functionNames.length > 1) {
    throw new Error(
      "Only one function name is allowed. All routes should be nested under it.",
    );
  }
  const functionName = functionNames[0];

  const routeHandlers = routeAPI[functionName];
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
            let pathParams = {} as z.infer<
              ValidURLParamsSchema<URLPathPattern>
            >;

            for (const routeName of routeNames) {
              const h = routeHandlers[routeName as keyof typeof routeHandlers];
              if (h.state.method === req.method) {
                const parsedURLParams = parseURLPatternParams({
                  pattern: `/${functionName}${h.state.path}`,
                  url: req.url,
                  paramSchema: h.state.pathParamsSchema,
                });

                if (parsedURLParams.success) {
                  handler = h;
                  pathParams = parsedURLParams.params as z.infer<
                    ValidURLParamsSchema<URLPathPattern>
                  >;
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
              } = handler.state;

              const { supabaseClient, user } =
                isJWTVerificationDisabled ?
                  {}
                : await getSupabaseClientAndUser(req);

              const queryParams = parseSearchParamsFromURL(
                req.url,
                querySchema,
              );
              if (req.method === "GET") {
                const response = await action({
                  body: undefined,
                  request: req,
                  info,
                  queryParams,
                  supabaseClient,
                  user,
                  urlParams: pathParams,
                });
                return responseSuccess(response);
              }

              const body = await parseBodyParams(req, bodySchema);
              const response = await action({
                body,
                request: req,
                info,
                supabaseClient,
                user,
                urlParams: pathParams,
                queryParams,
              });
              return responseSuccess(response);
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
