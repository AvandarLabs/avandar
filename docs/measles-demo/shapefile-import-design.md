# Shapefile import: design

Status: draft for review. Follows
[workflow-b-map-features-design.md](workflow-b-map-features-design.md), whose
section 8 lists School Point Locations (`jfju-ynrr`) as not loadable.

## 1. Problem

Many boundary and facility datasets are published only as a zipped ESRI
shapefile: NYC's School Point Locations (`jfju-ynrr`), most HDX
`*_SHP.zip` resources, and city boundary files. Avandar cannot read any of
them:

- `ZIP` and `SHP` are in `workspaceLoadability.unloadableFormats`
  (`apps/pipeline-server/pipelines/etl.config.yaml`), so the catalog lists
  them but a workspace cannot add them (the trigger in
  `supabase/schemas/20.datasets__open_data.sql` refuses).
- A Parquet copy cannot be built either. The Socrata download script always
  answers with paged CSV export URLs
  (`createSocrataListingDownload.ts`), and a Socrata file asset has no CSV
  export. The whole-file path only knows `contentKind: "csv" | "parquet"`
  (`packages/node/etl/src/ListingDownload/ListingDownload.types.ts`,
  `buildOpenDataParquetCache.ts`).

## 2. What `jfju-ynrr` actually is (verified 2026-11-09)

| Fact | Value |
| --- | --- |
| Download | `https://data.cityofnewyork.us/download/jfju-ynrr/application%2Fx-zip-compressed`, 119 KB |
| Contents | One layer: `SchoolPoints_APS_2024_08_28` `.shp`, `.shx`, `.dbf`, `.prj`, `.cpg`, plus `.sbn`, `.sbx`, `.shp.xml` |
| Projection | `.prj` is WGS 84 Web Mercator (EPSG:3857), not latitude and longitude |
| Rows | 1,950 points (NYC public schools, August 2024) |
| Attributes | `ATS`, `Building_C`, `Location_C`, `Name`, `Geographic`, `Latitude`, `Longitude`, and more (`.dbf` names are cut to 10 characters) |
| Readable by DuckDB | Yes: `ST_Read('/vsizip/<zip>/SchoolPoints_APS_2024_08_28.shp')` in native DuckDB with `spatial`, then `ST_Transform(geom, 'EPSG:3857', 'EPSG:4326', always_xy := true)` gives `POINT (-73.9787 40.7221)`, P.S. 015 in Manhattan |

The projection is the trap: plotting the raw coordinates as latitude and
longitude would put every school off the map, and assuming the wrong source
projection (EPSG:2263, the usual NYC one) puts them in Montana.

## 3. Decision: convert on the pipeline server, at cache-build time

| Option | Reprojection | Big archives | One conversion for every workspace | Verified |
| --- | --- | --- | --- | --- |
| **Pipeline server, native DuckDB + GDAL** | **Yes, from `.prj`** | **Streams to disk** | **Yes** | **Yes (section 2)** |
| In the browser, DuckDB-WASM `spatial` | Unknown | Limited by browser memory | No, every workspace repeats it | No: GDAL driver support in the WASM build is unverified |
| Ask publishers for another format | n/a | n/a | n/a | Not in our control |

The output is an ordinary Parquet copy in the same shape the Socrata CSV
exports already produce for geometry: attribute columns plus one WKT text
column, `the_geom`, in EPSG:4326. GIS bindings (`GeometryColumnBinding` with
`encoding: "wkt"`), boundary joins, and Data Explorer all work on it without
any change.

## 4. Which listings are converted

A listing is a **shapefile candidate** when:

| Pipeline | Rule |
| --- | --- |
| Socrata | `source_asset_type = 'file'` and `api_resource_format = 'ZIP'` |
| HDX | Resource format is `SHP`, `Zipped Shapefile`, or `ZIP` |

Whether a ZIP really holds a shapefile is only known after downloading it, so
the decision happens at build time:

| Archive contents | Result |
| --- | --- |
| Exactly one `.shp`, with its `.shx` and `.dbf` | Converted |
| No `.shp` | Fails with `archive-not-geodata` |
| More than one `.shp` | Fails with `archive-has-multiple-layers` |
| `.shp` without `.prj`, coordinates all within longitude and latitude ranges | Converted, assumed EPSG:4326 |
| `.shp` without `.prj`, coordinates outside those ranges | Fails with `geodata-unknown-crs` |
| Over the size limits (section 6) | Fails with `archive-too-large` |

## 5. Changes

### 5.1 Download

- `WholeFileListingDownload.contentKind` gains `"zippedShapefile"`.
- The Socrata download script answers a file asset with
  `{ paging: false, url: <source_download_url>, contentKind: "zippedShapefile" }`
  when it is a shapefile candidate. Every other Socrata listing keeps the
  paged CSV path. This needs the config's `paging: true` rule relaxed to
  "pages unless the listing is a file asset," which the script contract
  (`ListingDownloadScript`) documents.
- `formatToContentKind` (`shared/connectors/open-data/formatToContentKind.ts`)
  maps the HDX shapefile formats to `"zippedShapefile"`.

### 5.2 Conversion

A new `convertZippedShapefileToParquetParts` in
`apps/pipeline-server/src/openDataParquetCache/convertToParquetParts/`, beside
the CSV and Parquet converters, called from `_copyWholeFile`:

1. List the archive's entries with a Node ZIP reader, without extracting
   them, and apply section 4's table and section 6's limits.
2. Read the small `.prj` and `.cpg` entries into memory with that reader.
   `ST_Read_Meta` cannot be used: it does not accept `/vsizip/` paths and
   returns no rows (checked with `jfju-ynrr`).
3. `COPY (SELECT * EXCLUDE (geom), ST_AsText(ST_Force2D(ST_Transform(geom, <prj WKT as a quoted literal>, 'EPSG:4326', always_xy := true))) AS the_geom FROM ST_Read('/vsizip/<zip>/<layer>.shp')) TO <parts>`,
   split into parts with the existing part-size logic. Passing the `.prj`
   text straight to `ST_Transform` is verified: it turns `jfju-ynrr`'s first
   point into `POINT (-73.9787 40.7221)`.
4. Use the `.cpg` for text encoding, defaulting to UTF-8.
5. Count rows whose geometry is null or invalid, and record the count with
   the build so the catalog can say "12 rows have no location."

`the_geom` is the column name every Socrata geometry export already uses, so
an author binding geometry sees the same name across sources. If the
`.dbf` already has a `the_geom` column, the converted one is
`the_geom_wkt`.

### 5.3 Loadability and columns

The crawl indexes a file asset with no columns and as not loadable. A
successful conversion has to fix both, in the same transaction as the cache
write:

- `rpc_data_catalog_listings__write_parquet_cache` gains an optional
  `p_relation_columns` argument. When present, it replaces the listing's
  `data_catalog_listings__relation_columns` rows and sets
  `is_workspace_loadable = true`.
- A failed conversion leaves the listing unloadable and records the failure
  code from section 4. The catalog shows "This file couldn't be converted"
  with the reason, instead of the generic unloadable state.
- `ZIP` and `SHP` stay in `unloadableFormats`, so nothing becomes addable
  until a conversion has actually succeeded.

### 5.4 Precaching `jfju-ynrr`

Once this ships, request its cache build the same way the other Workflow B
listings were cached. No data migration is needed: the build flips the
listing itself.

## 6. Safety limits

A ZIP from a public portal is untrusted input.

| Limit | Value | Why |
| --- | --- | --- |
| Compressed size | 500 MB | Download and disk budget |
| Uncompressed size, summed from the archive's directory | 2 GB | Zip bombs |
| Entry count | 200 | Pathological archives |
| Extraction | Never. GDAL reads through `/vsizip/`. | No path traversal, no temp-file cleanup |
| Entry names | Only the `.shp` the archive lists, passed as a quoted literal | No injection through file names |

## 7. Out of scope, in order of value

1. **Multi-layer archives.** One catalog listing per layer, which needs the
   crawl or a post-build step to create sibling listings.
2. **Other vector formats** in `unloadableFormats`: GeoJSON, KML, KMZ, GPKG.
   The same `ST_Read` converter handles them. Turn each on after testing
   it, GeoJSON first.
3. **Socrata map assets** (for example `4hft-v355`, "NTAs - Mapped"), which
   export GeoJSON from `/api/geospatial/<id>?method=export&format=GeoJSON`.
4. **Uploading a shapefile to a workspace.** Route the upload through the
   same pipeline-server converter rather than the browser, for the reasons in
   section 3.

## 8. Tests

- Unit: candidate detection for each row of section 4's first table.
- Converter, with small fixture archives checked in under the converter's
  test folder: one point layer in EPSG:3857 (assert the first point
  reprojects to within 1 m of a known latitude and longitude), one polygon
  layer in EPSG:4326, no `.prj` inside and outside coordinate ranges, two
  `.shp` files, no `.shp`, an oversized directory entry, a `.dbf` with its
  own `the_geom` column, and a Latin-1 `.cpg`.
- Build: `_copyWholeFile` with a `zippedShapefile` download writes parts,
  columns, and flips loadability, and a failed conversion records its code.
- pgTAP: `rpc_data_catalog_listings__write_parquet_cache` with and without
  `p_relation_columns`.
- Manual: build `jfju-ynrr` locally, add it to a workspace, and plot it.

## 9. Open questions

1. Whether to keep the source's own `Latitude` and `Longitude` columns when
   `the_geom` is added. Recommendation: keep every source column. They are
   the publisher's data, and some authors will prefer a latitude and
   longitude binding.
2. Whether the converted `the_geom` should be simplified for large polygon
   layers. Recommendation: no. The GIS app already simplifies per zoom level
   (`GeometrySimplification`), and the copy should stay faithful.
