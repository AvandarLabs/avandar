import { z } from "npm:zod@4";

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

/**
 * Extracts the names of all params in a path pattern and converts them
 * to a record of strings. For example, the pattern `/users/:id` will
 * be converted to `{ id: string }`.
 */
export type URLParams<Pattern extends `/${string}`> = {
  [K in _URLParamNameExtractor<Pattern, []>[number]]: string;
};

export type ValidURLParamsSchemaShape<Pattern extends `/${string}`> = {
  [K in keyof URLParams<Pattern>]: z.ZodTypeAny;
};

export type ValidURLParamsSchema<Pattern extends `/${string}`> =
  | z.ZodObject<ValidURLParamsSchemaShape<Pattern>>
  | z.ZodRecord<z.ZodString, z.ZodString>
  | z.ZodUndefined;

/**
 * Maps every param in a path pattern to a ZodString.
 * This is used if no path param schema is provided when defining a
 * server handler. In that case, all params will be parsed as strings.
 */
export type DefaultPathSchema<Pattern extends `/${string}`> = z.ZodObject<{
  [K in keyof URLParams<Pattern>]: z.ZodString;
}>;

/**
 * Parsers a URL pattern against a given URL.
 *
 * For example, given the pattern `/users/:id`, and a URL
 * `https://mydomain.com/users/abc`, it will return `{ id: "abc" }`.
 *
 * It then, optionally, applies a Zod schema to validate the params and return
 * a more type-rich object. If no schema is provided, it will return the params
 * as a record of strings.
 */
export function parseURLPatternParams<
  Pattern extends `/${string}`,
  ParamsSchema extends
    ValidURLParamsSchema<Pattern> = DefaultPathSchema<Pattern>,
>({
  pattern,
  url,
  paramSchema,
}: {
  pattern: Pattern;
  url: string;
  paramSchema?: ParamsSchema;
}):
  | {
      success: true;
      params: z.infer<ParamsSchema>;
    }
  | { success: false; params: undefined } {
  // first, make sure the pattern starts with a slash, and doesn't end in one
  const patternStartingWithSlash =
    pattern.startsWith("/") ? pattern : (`/${pattern}` as Pattern);
  const patternToUse =
    patternStartingWithSlash.endsWith("/") ?
      patternStartingWithSlash.slice(0, -1) // remove trailing slash
    : patternStartingWithSlash;

  // now, get the pathname from the URL to match again. And then also make
  // sure this path starts with a slash and doesn't end in one.
  const extractedURLPathname = new URL(url).pathname;
  const urlStartingWithSlash =
    extractedURLPathname.startsWith("/") ? extractedURLPathname : (
      `/${extractedURLPathname}`
    );
  const urlToUse =
    urlStartingWithSlash.endsWith("/") ?
      urlStartingWithSlash.slice(0, -1) // remove trailing slash
    : urlStartingWithSlash;

  // base case: matching against the / pattern
  if (patternToUse === ("/" as Pattern)) {
    if (urlToUse === "/") {
      return {
        success: true,
        params: {} as z.infer<ParamsSchema>,
      };
    }
    return { success: false, params: undefined };
  }

  // base case: there are no params to extract and the pattern and
  // url are the same
  if (!patternToUse.includes(":")) {
    if (patternToUse === urlToUse) {
      return {
        success: true,
        params: {} as z.infer<ParamsSchema>,
      };
    }
    return { success: false, params: undefined };
  }

  // at this point it means the pattern has a param (there's a colon somewhere),
  // so we need to extract it

  // great, now we can match the url to the pattern
  // first, split on any slashes
  const patternParts = patternToUse.split("/");
  const urlParts = urlToUse.split("/");

  // if the parts are of different length, we know this won't work
  if (patternParts.length !== urlParts.length) {
    return { success: false, params: undefined };
  }

  // now, we iterate over the pattern parts and the url parts to collect params
  // if at any point the parts don't match, we return a failed match
  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const urlPart = urlParts[i];

    if (patternPart.startsWith(":")) {
      // this is a param. Remove the colon and use it as the key.
      const paramName = patternPart.slice(1);
      if (paramName === "") {
        throw new Error(
          "Invalid pattern: param name cannot be empty. Encountered a single colon with no name after it.",
        );
      }
      params[paramName] = urlPart;
    } else {
      // if it's not a param, the url and pattern must be an exact
      // match, otherwise we return a failed match
      if (patternPart !== urlPart) {
        return { success: false, params: undefined };
      }
    }
  }

  // at this point, we know the url matches the pattern and we extracted all
  // params. So now we need to validate the params against the given schema.
  // If no schema is given, then return the params as is. We know it's a
  // record of strings at this point.
  if (!paramSchema) {
    return { success: true, params: params as z.infer<ParamsSchema> };
  }
  return {
    success: true,
    params: paramSchema.parse(params) as z.infer<ParamsSchema>,
  };
}
