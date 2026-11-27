import { createDefaultRouteHandler } from "@sbfn/_shared/MiniServer/createServerRouteHandler.ts";
import { z } from "zod";
import type {
  URLPathPattern,
  ValidPathParams,
  ValidReturnType,
} from "@sbfn/_shared/MiniServer/api.types.ts";
import type { AnyZodType } from "@sbfn/_shared/MiniServer/createServerRouteHandler.ts";
import type {
  ServerRouteHandler,
  URLPathWithoutParams,
} from "@sbfn/_shared/MiniServer/MiniServer.types.ts";
import type { ValidPathParamsSchemaShape } from "@sbfn/_shared/MiniServer/parseURLPathParams.ts";

/** Parses and validates the request body for a MiniServer route. */
export async function parseBodyParams<Body extends AnyZodType>(
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

/** Creates a typed GET route handler with optional path parameters. */
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

/** Creates a typed GET route handler with optional path parameters. */
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

/** Creates a typed GET route handler with optional path parameters. */
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

/** Creates a typed POST route handler with optional path parameters. */
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

/** Creates a typed POST route handler with optional path parameters. */
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

/** Creates a typed POST route handler with optional path parameters. */
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

/** Creates a typed PATCH route handler with optional path parameters. */
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

/** Creates a typed PATCH route handler with optional path parameters. */
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

/** Creates a typed PATCH route handler with optional path parameters. */
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
