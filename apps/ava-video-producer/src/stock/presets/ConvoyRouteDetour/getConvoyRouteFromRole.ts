import { propEq } from "@avandar/utils";
import type { Input } from "./ConvoyRouteDetour.schema";

/** Resolves a required authored route without assuming unchecked membership. */
export function getConvoyRouteFromRole({
  input,
  role,
}: Readonly<{
  input: Input;
  role: Input["routes"][number]["role"];
}>): Input["routes"][number] {
  const route = input.routes.find(propEq("role", role));
  if (!route) {
    throw new Error(`Missing required convoy route: ${role}`);
  }
  return route;
}
