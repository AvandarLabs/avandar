import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.ts";

/**
 * A listing's own description of how to read its source's freshness token:
 * one GET in the listing's drive, and how its body becomes the token. The
 * listing model owns the shape, since a pipeline writes it onto the listing
 * (`api_freshness_probe`).
 */
export type FreshnessProbe = DataCatalogListing.FreshnessProbe;

/** How a probe's response body becomes a freshness token. */
export type FreshnessProbeTokenRule = FreshnessProbe["token"];

/** Why a freshness probe could not produce a token. */
export type FreshnessProbeProblem =
  /** The URL is not `https`, or not under the listing's `api_base_url`. */
  | "url-not-allowed"
  /** The response body is larger than a probe may read. */
  | "body-too-large"
  /** A `json-paths` probe got a body that is not JSON. */
  | "body-not-json"
  /** A `json-paths` probe's path led to no value. */
  | "path-missing";
