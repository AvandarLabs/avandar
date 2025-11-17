import type { AnyValidPathParamsRecord, ValidPathParams } from "./api.types.ts";
import type { ZodObject, ZodType } from "npm:zod@4";

export type ValidPathParamsSchemaShape<
  PathParams extends AnyValidPathParamsRecord | undefined,
> = {
  // the path param is always received as a string (that's what we get from the
  // URL), but the output after parsing should be whatever is defined in the
  // PathParams record
  [K in keyof PathParams]: ZodType<PathParams[K], string>;
};

export type ValidPathParamsSchema<
  PathParams extends AnyValidPathParamsRecord | undefined,
> =
  PathParams extends AnyValidPathParamsRecord ?
    ZodObject<ValidPathParamsSchemaShape<PathParams>>
  : undefined;

/**
 * Parses a URL by extracting the path params given a path pattern.
 *
 * For example, given the pattern `/users/:id`, and a URL
 * `https://mydomain.com/users/abc`, it will return `{ id: "abc" }`.
 *
 * It then, optionally, applies a Zod schema to validate the params and return
 * a more type-rich object. If no schema is provided, it will return the params
 * as a record of strings.
 */
export function parseURLPathParams<
  Pattern extends `/${string}`,
  PathParams extends ValidPathParams<Pattern> | undefined,
>({
  pattern,
  url,
  paramSchema,
}: {
  pattern: Pattern;
  url: string;
  paramSchema?: ValidPathParamsSchema<PathParams>;
}):
  | {
      success: true;
      params: PathParams;
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
        params: {} as PathParams,
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
        params: {} as PathParams,
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
    return { success: true, params: params as PathParams };
  }
  return {
    success: true,
    params: paramSchema.parse(params) as PathParams,
  };
}
