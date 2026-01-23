import { z } from "zod";
import { authMiddleware } from "../authMiddleware.ts";
import { corsHeaders } from "../cors.ts";
import { BAD_REQUEST, INTERNAL_SERVER_ERROR } from "../httpCodes.ts";
import {
  AvaSupabaseClient,
  createSupabaseClient,
  SupabaseAdmin,
} from "../supabase.ts";
import { createDefaultRouteHandler } from "./createServerRouteHandler.ts";
import {
  parseURLPathParams,
  ValidPathParamsSchemaShape,
} from "./parseURLPathParams.ts";
import { isRedirect } from "./redirect.ts";
import { responseError } from "./responseError.ts";
import { responseSuccess } from "./responseSuccess.ts";
import type {
  AnyValidPathParamsRecord,
  GenericAPITypeDef,
  GenericRouteAPIRecord,
  HTTPMethod,
  URLPathPattern,
  ValidBody,
  ValidPathParams,
  ValidReturnType,
} from "./api.types.ts";
import type { AnyZodType } from "./createServerRouteHandler.ts";
import type {
  MiniServerAPIDef,
  MiniServerRoutesDef,
  QueryParamsSchema,
  ServerRouteHandler,
  URLPathWithoutParams,
  ValidQueryParams,
} from "./MiniServer.types.ts";
import type { User } from "@supabase/supabase-js";

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
    if (error instanceof z.ZodError) {
      throw new Error(`${baseMessage}\n${z.prettifyError(error)}`);
    }
    if (error instanceof Error) {
      throw new Error(`${baseMessage}: ${String(error.message)}`);
    }
    throw new Error(`${baseMessage}: ${String(error)}`);
  }
}

async function parseBodyParams<Body extends AnyZodType>(
  req: Request,
  bodySchema: Body,
): Promise<z.infer<Body>> {
  try {
    const reqBody = await req.json();
    return bodySchema.parse(reqBody);
  } catch (error) {
    const baseMessage = "Error parsing body params";
    if (error instanceof z.ZodError) {
      throw new Error(`${baseMessage}. ${z.prettifyError(error)}`);
    }
    if (error instanceof Error) {
      throw new Error(`${baseMessage}: ${String(error.message)}`);
    }
    throw new Error(`${baseMessage}: ${String(error)}`);
  }
}

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
  undefined,
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
  undefined,
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
  undefined,
  false
> {
  return createDefaultRouteHandler({
    method: "GET",
    path: typeof path === "string" ? path : path.path,
    pathSchema:
      typeof path === "object" && "schema" in path ? path.schema : undefined,
  });
}

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
  Record<string, never>,
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
  Record<string, never>,
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
  Record<string, never>,
  false
> {
  return createDefaultRouteHandler({
    method: "POST",
    path: typeof path === "string" ? path : path.path,
    pathSchema:
      typeof path === "object" && "schema" in path ? path.schema : undefined,
  });
}

export function PATCH<
  Path extends URLPathPattern,
  ReturnType extends ValidReturnType,
>(
  path: URLPathWithoutParams<Path>,
): ServerRouteHandler<
  "PATCH",
  Path,
  ReturnType,
  undefined,
  undefined,
  Record<string, never>,
  false
>;
export function PATCH<
  Path extends URLPathPattern,
  ReturnType extends ValidReturnType,
  PathParams extends ValidPathParams<Path>,
>(options: {
  path: Path;
  schema: ValidPathParamsSchemaShape<PathParams>;
}): ServerRouteHandler<
  "PATCH",
  Path,
  ReturnType,
  PathParams,
  undefined,
  Record<string, never>,
  false
>;
export function PATCH<
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
  "PATCH",
  Path,
  ReturnType,
  PathParams,
  undefined,
  Record<string, never>,
  false
> {
  return createDefaultRouteHandler({
    method: "PATCH",
    path: typeof path === "string" ? path : path.path,
    pathSchema:
      typeof path === "object" && "schema" in path ? path.schema : undefined,
  });
}

async function _getSupabaseClientAndUser(request: Request): Promise<{
  supabaseClient: AvaSupabaseClient;
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
        async (r: Request, info: Deno.ServeHandlerInfo<Deno.NetAddr>) => {
          // This is needed for functions invoked from a browser.
          if (r.method === "OPTIONS") {
            return new Response("ok", { headers: corsHeaders });
          }

          try {
            let handler = undefined;
            let pathParams = {} as AnyValidPathParamsRecord;

            for (const routeName of routeNames) {
              const methodHandlers =
                routeHandlers[routeName as keyof typeof routeHandlers];
              const h = methodHandlers[r.method as keyof typeof methodHandlers];

              // find the first handler that matches the requested method and
              // that parses the path params successfully
              if (h && h.state.method === r.method) {
                const parsedPathParams = parseURLPathParams({
                  pattern: `/${functionName}${h.state.path}`,
                  url: r.url,

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
              console.log(`Received request for path: '${handler.state.path}'`);

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
                  ValidBody,
                  boolean
                >
              ).state;

              return await authMiddleware({
                request: r,
                skipJWTVerification: isJWTVerificationDisabled,
                callback: async (options: {
                  req: Request;
                  supabaseClient: AvaSupabaseClient | undefined;
                  user: User | undefined;
                }) => {
                  const { req, supabaseClient, user } = options;

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
                      supabaseAdminClient: SupabaseAdmin,
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
                    supabaseAdminClient: SupabaseAdmin,
                  });
                  return response instanceof Response ? response : (
                      responseSuccess(response)
                    );
                },
              });
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
