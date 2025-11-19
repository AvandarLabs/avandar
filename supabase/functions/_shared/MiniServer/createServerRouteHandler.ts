import {
  object,
  record,
  string,
  never as zNever,
  ZodType,
  undefined as zUndefined,
} from "npm:zod@4";
import type {
  AnyValidPathParamsRecord,
  HTTPMethod,
  UnknownRecord,
  URLPathPattern,
  ValidBody,
  ValidPathParams,
  ValidReturnType,
} from "./api.types.ts";
import type {
  HTTPMethodActionFn,
  HTTPMethodActionFnOptions,
  InferBody,
  MakeOptionalIfUndefined,
  QueryParamsSchemaShape,
  ServerRouteHandler,
  ValidBodySchema,
  ValidQueryParams,
} from "./MiniServer.types.ts";
import type {
  ValidPathParamsSchema,
  ValidPathParamsSchemaShape,
} from "./parseURLPathParams.ts";
import type { infer as ZodInfer, ZodObject } from "npm:zod@4";

/* eslint-disable @typescript-eslint/no-explicit-any */
// deno-lint-ignore no-explicit-any
export type AnyZodType = ZodType<any, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

export function actionNotImplemented<
  PathParams extends AnyValidPathParamsRecord | undefined,
  QueryParams extends ValidQueryParams | undefined,
  Body = never,
  IsJWTVerificationDisabled extends boolean = false,
  ReturnType extends ValidReturnType = UnknownRecord,
>(
  _params: HTTPMethodActionFnOptions<
    PathParams,
    QueryParams,
    Body,
    IsJWTVerificationDisabled
  >,
): ReturnType {
  throw new Error("Not implemented");
}

function isZodType(value: unknown): value is AnyZodType {
  if (value !== null && typeof value === "object" && value instanceof ZodType) {
    return true;
  }
  return false;
}

export function createServerRouteHandler<
  Method extends HTTPMethod,
  Path extends URLPathPattern,
  ReturnType extends ValidReturnType,
  PathParams extends ValidPathParams<Path> | undefined,
  QueryParams extends ValidQueryParams | undefined,
  Body extends ValidBody,
  IsJWTVerificationDisabled extends boolean = false,
>(
  state: ServerRouteHandler<
    Method,
    Path,
    ReturnType,
    PathParams,
    QueryParams,
    Body,
    IsJWTVerificationDisabled
  >["state"],
): ServerRouteHandler<
  Method,
  Path,
  ReturnType,
  PathParams,
  QueryParams,
  Body,
  IsJWTVerificationDisabled
> {
  return {
    state,

    // GET methods do not support changing the body schema, so we make an
    // eplicit check for that at the type level and in the implementation.
    bodySchema: <NewBodySchema extends ValidBodySchema>(
      newBodySchema: NewBodySchema,
    ): Method extends "GET" ? never
    : ServerRouteHandler<
        Method,
        Path,
        ReturnType,
        PathParams,
        QueryParams,
        InferBody<NewBodySchema>,
        IsJWTVerificationDisabled
      > => {
      if (state.method === "GET") {
        throw new Error("GET methods do not support changing the body schema");
      }

      return createServerRouteHandler({
        ...state,
        bodySchema:
          isZodType(newBodySchema) ? newBodySchema : object(newBodySchema),

        // if the body schema is changed AFTER we had already set the action,
        // then we need to reset the action to the not-implemented function
        action: actionNotImplemented as HTTPMethodActionFn<
          PathParams,
          QueryParams,
          ZodInfer<NewBodySchema>,
          IsJWTVerificationDisabled,
          ReturnType
        >,
      }) as Method extends "GET" ? never
      : ServerRouteHandler<
          Method,
          Path,
          ReturnType,
          PathParams,
          QueryParams,
          InferBody<NewBodySchema>,
          IsJWTVerificationDisabled
        >;
    },
    querySchema: <
      NewQueryParamsSchemaShape extends
        QueryParamsSchemaShape<ValidQueryParams>,
    >(
      newQueryParamsSchemaShape: NewQueryParamsSchemaShape,
    ): ServerRouteHandler<
      Method,
      Path,
      ReturnType,
      PathParams,
      MakeOptionalIfUndefined<ZodInfer<ZodObject<NewQueryParamsSchemaShape>>>,
      Body,
      IsJWTVerificationDisabled
    > => {
      return createServerRouteHandler({
        ...state,

        /* eslint-disable @typescript-eslint/no-explicit-any */
        // deno-lint-ignore no-explicit-any
        querySchema: object(newQueryParamsSchemaShape) as any,
        /* eslint-enable  @typescript-eslint/no-explicit-any */

        // if the query schema is changed AFTER we had already set the action,
        // then we need to reset the action to the not-implemented function
        action: actionNotImplemented as HTTPMethodActionFn<
          PathParams,
          MakeOptionalIfUndefined<
            ZodInfer<ZodObject<NewQueryParamsSchemaShape>>
          >,
          Body,
          IsJWTVerificationDisabled,
          ReturnType
        >, // reset the action
      });
    },
    disableJWTVerification: (): ServerRouteHandler<
      Method,
      Path,
      ReturnType,
      PathParams,
      QueryParams,
      Body,
      true
    > => {
      return createServerRouteHandler({
        ...state,
        isJWTVerificationDisabled: true,
        action: actionNotImplemented as HTTPMethodActionFn<
          PathParams,
          QueryParams,
          Body,
          true,
          ReturnType
        >, // reset the action
      });
    },
    action: <NewReturnType extends ValidReturnType>(
      action: HTTPMethodActionFn<
        PathParams,
        QueryParams,
        Body,
        IsJWTVerificationDisabled,
        NewReturnType
      >,
    ): ServerRouteHandler<
      Method,
      Path,
      NewReturnType,
      PathParams,
      QueryParams,
      Body,
      IsJWTVerificationDisabled
    > => {
      return createServerRouteHandler({ ...state, action });
    },
  };
}

export function createDefaultRouteHandler<
  Method extends HTTPMethod,
  Path extends URLPathPattern,
  ReturnType extends ValidReturnType,
  PathParams extends ValidPathParams<Path> | undefined,
>(options: {
  method: Method;
  path: Path;
  pathSchema?: ValidPathParamsSchemaShape<PathParams>;
}): ServerRouteHandler<
  Method,
  Path,
  ReturnType,
  PathParams,
  undefined,
  Method extends "GET" ? undefined : Record<string, never>,
  false
> {
  const { method, path, pathSchema } = options;

  return createServerRouteHandler({
    method,
    path: path,
    pathParamsSchema: (pathSchema ?
      object(pathSchema)
    : undefined) as ValidPathParamsSchema<PathParams>,
    querySchema: undefined,
    bodySchema: (method === "GET" ? zUndefined() : (
      record(string(), zNever())
    )) as unknown as ZodType<
      Method extends "GET" ? undefined : Record<string, never>,
      /* eslint-disable @typescript-eslint/no-explicit-any */
      // deno-lint-ignore no-explicit-any
      any
      /* eslint-enable @typescript-eslint/no-explicit-any */
    >,
    action: actionNotImplemented as HTTPMethodActionFn<
      AnyValidPathParamsRecord | undefined,
      undefined,
      Method extends "GET" ? undefined : Record<string, never>,
      false,
      ReturnType
    >,
    isJWTVerificationDisabled: false,
  }) as ServerRouteHandler<
    Method,
    Path,
    ReturnType,
    PathParams,
    undefined,
    Method extends "GET" ? undefined : Record<string, never>,
    false
  >;
}
