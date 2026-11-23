import { ComponentTokenDefinitions } from "./ComponentTokenDefinitions";
/** Tokens of the query column cache growth graphic. */
export const QUERY_CACHE_TOKENS = {
  tableRadius: ComponentTokenDefinitions.makeLengthToken({
    label: "Cache table radius",
    description: "Corner radius of the cached relation.",
  }),
  tableStrokeWidth: ComponentTokenDefinitions.makeStrokeToken({
    label: "Cache table outline width",
    description: "Width of the cached relation's outline.",
  }),
  gridStrokeWidth: ComponentTokenDefinitions.makeStrokeToken({
    label: "Cache grid width",
    description:
      "Width of the row and column lines inside the cached relation.",
  }),
  missingDash: ComponentTokenDefinitions.makeDashToken({
    label: "Missing column dash",
    description: "Dash pattern of a column the cache does not hold yet.",
  }),
  missingStrokeWidth: ComponentTokenDefinitions.makeStrokeToken({
    label: "Missing column outline width",
    description: "Width of a missing column's dashed outline.",
  }),
  cardRadius: ComponentTokenDefinitions.makeLengthToken({
    label: "Request card radius",
    description: "Corner radius of a query request card.",
  }),
  cardStrokeWidth: ComponentTokenDefinitions.makeStrokeToken({
    label: "Request card outline width",
    description: "Width of a request card's outline.",
  }),
  checkWidth: ComponentTokenDefinitions.makeStrokeToken({
    label: "Covered check width",
    description: "Width of the check on a request the cache covers.",
  }),
  routeStrokeWidth: ComponentTokenDefinitions.makeStrokeToken({
    label: "Request route width",
    description: "Width of the routes from a request to its columns.",
  }),
  portRadius: ComponentTokenDefinitions.makeLengthToken({
    label: "Column port radius",
    description: "Radius of the ring where a request route meets a column.",
  }),
} as const;
