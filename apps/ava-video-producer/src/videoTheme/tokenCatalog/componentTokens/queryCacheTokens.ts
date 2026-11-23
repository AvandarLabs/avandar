import {
  createDashToken,
  createLengthToken,
  createStrokeToken,
} from "./componentTokenHelpers";

/** Tokens of the query column cache growth graphic. */
export const QUERY_CACHE_TOKENS = {
  tableRadius: createLengthToken(
    "Cache table radius",
    "Corner radius of the cached relation.",
  ),
  tableStrokeWidth: createStrokeToken(
    "Cache table outline width",
    "Width of the cached relation's outline.",
  ),
  gridStrokeWidth: createStrokeToken(
    "Cache grid width",
    "Width of the row and column lines inside the cached relation.",
  ),
  missingDash: createDashToken(
    "Missing column dash",
    "Dash pattern of a column the cache does not hold yet.",
  ),
  missingStrokeWidth: createStrokeToken(
    "Missing column outline width",
    "Width of a missing column's dashed outline.",
  ),
  cardRadius: createLengthToken(
    "Request card radius",
    "Corner radius of a query request card.",
  ),
  cardStrokeWidth: createStrokeToken(
    "Request card outline width",
    "Width of a request card's outline.",
  ),
  checkWidth: createStrokeToken(
    "Covered check width",
    "Width of the check on a request the cache covers.",
  ),
  routeStrokeWidth: createStrokeToken(
    "Request route width",
    "Width of the routes from a request to its columns.",
  ),
  portRadius: createLengthToken(
    "Column port radius",
    "Radius of the ring where a request route meets a column.",
  ),
} as const;
