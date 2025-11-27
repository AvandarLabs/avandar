import { Logger } from "@/lib/Logger";

type _URLParamNameExtractor<
  RoutePath extends `/${string}`,
  ParamNames extends readonly string[] = [],
> =
  RoutePath extends "/" ? ParamNames
  : RoutePath extends `/${infer Head}/${infer Rest}` ?
    Head extends `$${infer ParamName}` ?
      [...ParamNames, ParamName, ..._URLParamNameExtractor<`/${Rest}`>]
    : [...ParamNames, ..._URLParamNameExtractor<`/${Rest}`>]
  : RoutePath extends `/$${infer ParamName}` ? [...ParamNames, ParamName]
  : ParamNames;

type ValidPathParamValue = string | number;

export type PathParams<RoutePath extends `/${string}`> = {
  [K in _URLParamNameExtractor<RoutePath, []>[number]]: ValidPathParamValue;
};

export function replaceURLPathParams<RoutePath extends `/${string}`>(options: {
  path: RoutePath;
  pathParams?: PathParams<RoutePath>;
}): string {
  const { path, pathParams } = options;
  if (pathParams === undefined) {
    return path;
  }

  return path.replace(/\$([a-zA-Z0-9_]+)/g, (_, paramName: string) => {
    const paramValue = (pathParams as Record<string, string | number>)[
      paramName
    ];
    if (paramValue) {
      return String(paramValue);
    }
    const errMsg = `Could not build a URL for ${path}. No parameter was passed in for '${paramName}'`;
    Logger.error(errMsg, { path, pathParams });
    throw new Error(errMsg);
  });
}
