import { ValidBody } from "./MiniServer.types.ts";

export type HTTPMethod = "POST" | "GET" | "PUT" | "DELETE" | "PATCH";
export type UnknownRecord = Record<string, unknown>;
export type URLPathPattern = `/${string}`;
export type ValidReturnType = Record<string, unknown> | void | Response;

type _URLParamNameExtractor<
  Pattern extends `/${string}`,
  ParamNames extends readonly string[] = [],
> =
  Pattern extends "/" ? ParamNames
  : Pattern extends `/${infer Head}/${infer Rest}` ?
    Head extends `:${infer ParamName}` ?
      [...ParamNames, ParamName, ..._URLParamNameExtractor<`/${Rest}`>]
    : [...ParamNames, ..._URLParamNameExtractor<`/${Rest}`>]
  : Pattern extends `/:${infer ParamName}` ? [...ParamNames, ParamName]
  : ParamNames;

type ValidPathParamValue = string | number;

export type AnyValidPathParamsRecord = Record<string, ValidPathParamValue>;

/**
 * Extracts the names of all params in a path pattern and converts them
 * to a record of strings. For example, the pattern `/users/:id` will
 * be converted to `{ id: ValidPathParamValue }`.
 */
export type ValidPathParams<Pattern extends `/${string}`> = {
  [K in _URLParamNameExtractor<Pattern, []>[number]]: ValidPathParamValue;
};

type ValidRouteAPI<Path extends URLPathPattern> = {
  returnType: ValidReturnType;
  pathParams?: ValidPathParams<Path>;
  queryParams?: Record<string, unknown>;
  body?: ValidBody;
};

export type GenericRouteAPIRecord = {
  [Path in URLPathPattern]: {
    [Method in HTTPMethod]?: ValidRouteAPI<Path>;
  };
};

/**
 * This is used to enforce that `T` is of the appropriate structure.
 * Functionally, it is a no-op. We use this only at the type-level to enforce
 * that an API type is well-formed.
 */
export type APITypeDef<
  FunctionName extends string,
  Paths extends [URLPathPattern, ...URLPathPattern[]],
  ValidRoutesAPI extends {
    [Path in Paths[number]]: {
      [Method in HTTPMethod]?: ValidRouteAPI<Path>;
    };
  },
> = {
  [FnName in FunctionName]: ValidRoutesAPI;
};

export type GenericAPITypeDef = APITypeDef<
  string,
  [URLPathPattern, ...URLPathPattern[]],
  GenericRouteAPIRecord
>;
