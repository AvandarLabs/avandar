import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { MAX_CONTENT_FILE_BYTES } from "@avandar/plugin-manifest";
import { DuckDBInstance } from "@duckdb/node-api";
import { z } from "zod";
import {
  findSimplifyToleranceUnderLimit,
  getProblemsFromBoundaries,
  makeCsvTextFromRows,
  makeToleranceLadder,
} from "./mozambiqueBoundaryHelpers/mozambiqueBoundaryHelpers";
import type { DuckDBConnection } from "@duckdb/node-api";

/*
 * Source: geoBoundaries' gbHumanitarian release of Mozambique, built from
 * Mozambique INE (Instituto Nacional de Estatistica) census 2007 data, cleaned
 * by UN OCHA ROSEA, and published through HDX. License: Creative Commons
 * Attribution 3.0 Intergovernmental Organisations (CC BY 3.0 IGO). Anyone who
 * ships or redistributes the generated CSVs must credit the source and
 * indicate that the shapes were simplified. The release ids written into the
 * CSVs are recorded in `plugins/mozambique/content/README.md`.
 */
const GEOBOUNDARIES_API_URL =
  "https://www.geoboundaries.org/api/current/gbHumanitarian/MOZ";
const CONTENT_DIRECTORY = "plugins/mozambique/content";

// About a meter at the equator. Boundary maps need no finer coordinates,
// and rounding roughly halves the WKT.
const COORDINATE_GRID_DEGREES = 0.00001;
const TOLERANCES = makeToleranceLadder({
  stepDegrees: 0.00025,
  maxDegrees: 0.01,
});

const BoundaryReleaseSchema = z.object({
  boundaryID: z.string(),
  boundarySource: z.string(),
  boundaryLicense: z.string(),
  simplifiedGeometryGeoJSON: z.url(),
});

type BoundaryRelease = z.infer<typeof BoundaryReleaseSchema>;

type BoundaryLayer = Readonly<{
  label: string;
  table: "provinces" | "districts";
  fileName: string;
  columns: readonly string[];
}>;

const PROVINCE_LAYER: BoundaryLayer = {
  label: "Provinces",
  table: "provinces",
  fileName: "mz-adm1.csv",
  columns: ["province_code", "province_name"],
};

const DISTRICT_LAYER: BoundaryLayer = {
  label: "Districts",
  table: "districts",
  fileName: "mz-adm2.csv",
  columns: ["district_code", "district_name", "province_code", "province_name"],
};

async function _fetchBoundaryRelease(
  level: "ADM1" | "ADM2",
): Promise<BoundaryRelease> {
  const response = await fetch(`${GEOBOUNDARIES_API_URL}/${level}/`);
  if (!response.ok) {
    throw new Error(`geoBoundaries ${level} answered ${response.status}.`);
  }
  return BoundaryReleaseSchema.parse(await response.json());
}

async function _downloadGeoJson(options: {
  release: BoundaryRelease;
  path: string;
}): Promise<void> {
  const url = options.release.simplifiedGeometryGeoJSON;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} answered ${response.status}.`);
  }
  writeFileSync(options.path, Buffer.from(await response.arrayBuffer()));
}

function _quoteSqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

// A district's province is the one holding its point on surface, found on
// the downloaded shapes before any simplification moves a border.
async function _loadBoundaries(options: {
  connection: DuckDBConnection;
  provincesPath: string;
  districtsPath: string;
}): Promise<void> {
  const { connection, provincesPath, districtsPath } = options;
  await connection.run(`
    CREATE TABLE provinces AS
    SELECT
      COALESCE(NULLIF(trim(shapeISO), ''), shapeID) AS province_code,
      trim(shapeName) AS province_name,
      geom
    FROM ST_Read(${_quoteSqlString(provincesPath)})
  `);
  await connection.run(`
    CREATE TABLE districts AS
    SELECT
      district.shapeID AS district_code,
      trim(district.shapeName) AS district_name,
      province.province_code,
      province.province_name,
      district.geom
    FROM ST_Read(${_quoteSqlString(districtsPath)}) AS district
    LEFT JOIN provinces AS province
      ON ST_Contains(province.geom, ST_PointOnSurface(district.geom))
  `);
}

async function _readStringRows(options: {
  connection: DuckDBConnection;
  sql: string;
}): Promise<Array<Array<string | undefined>>> {
  const reader = await options.connection.runAndReadAll(options.sql);
  return reader.getRowsJS().map((row) => {
    return row.map((value) => {
      return value === null ? undefined : String(value);
    });
  });
}

async function _assertBoundariesAreConsistent(
  connection: DuckDBConnection,
): Promise<void> {
  const provinceRows = await _readStringRows({
    connection,
    sql: "SELECT province_code FROM provinces",
  });
  const districtRows = await _readStringRows({
    connection,
    sql: "SELECT district_code, district_name, province_code FROM districts",
  });
  const problems = getProblemsFromBoundaries({
    provinceCodes: provinceRows.map(([code]) => {
      return code ?? "";
    }),
    districts: districtRows.map(([code, name, provinceCode]) => {
      return { code: code ?? "", name: name ?? "", provinceCode };
    }),
  });
  if (problems.length > 0) {
    throw new Error(`The boundaries are inconsistent:\n${problems.join("\n")}`);
  }
}

async function _makeLayerCsvText(options: {
  connection: DuckDBConnection;
  layer: BoundaryLayer;
  tolerance: number;
}): Promise<string> {
  const { connection, layer, tolerance } = options;
  const geometrySql = `ST_AsText(ST_ReducePrecision(ST_SimplifyPreserveTopology(geom, ${tolerance}), ${COORDINATE_GRID_DEGREES}))`;
  // `ORDER BY 1` sorts by the layer's first column, its code.
  const rows = await _readStringRows({
    connection,
    sql: `SELECT ${layer.columns.join(", ")}, ${geometrySql} AS geometry FROM ${layer.table} ORDER BY 1`,
  });
  return makeCsvTextFromRows({
    header: [...layer.columns, "geometry"],
    rows: rows.map((row) => {
      return row.map((value) => {
        return value ?? "";
      });
    }),
  });
}

async function _writeLayer(options: {
  connection: DuckDBConnection;
  layer: BoundaryLayer;
  repoRoot: string;
}): Promise<void> {
  const { connection, layer, repoRoot } = options;
  const found = await findSimplifyToleranceUnderLimit({
    tolerances: TOLERANCES,
    limitBytes: MAX_CONTENT_FILE_BYTES,
    makeCsvText: (tolerance) => {
      return _makeLayerCsvText({ connection, layer, tolerance });
    },
  });
  writeFileSync(
    join(repoRoot, CONTENT_DIRECTORY, layer.fileName),
    found.csvText,
  );
  // The header line is the only line that is not a feature.
  const featureCount = found.csvText.trimEnd().split("\n").length - 1;
  console.log(
    `${layer.label}: ${featureCount} features, ${layer.fileName} ${found.byteSize} bytes, tolerance ${found.tolerance} degrees`,
  );
}

async function _downloadRelease(options: {
  level: "ADM1" | "ADM2";
  path: string;
}): Promise<void> {
  const release = await _fetchBoundaryRelease(options.level);
  console.log(
    `${release.boundaryID}: ${release.boundaryLicense}. Source: ${release.boundarySource}`,
  );
  await _downloadGeoJson({ release, path: options.path });
}

async function _buildBoundaries(options: {
  connection: DuckDBConnection;
  workDirectory: string;
  repoRoot: string;
}): Promise<void> {
  const { connection, workDirectory, repoRoot } = options;
  const provincesPath = join(workDirectory, "adm1.geojson");
  const districtsPath = join(workDirectory, "adm2.geojson");
  await _downloadRelease({ level: "ADM1", path: provincesPath });
  await _downloadRelease({ level: "ADM2", path: districtsPath });
  await connection.run("INSTALL spatial; LOAD spatial;");
  await _loadBoundaries({ connection, provincesPath, districtsPath });
  await _assertBoundariesAreConsistent(connection);
  mkdirSync(join(repoRoot, CONTENT_DIRECTORY), { recursive: true });
  await _writeLayer({ connection, layer: PROVINCE_LAYER, repoRoot });
  await _writeLayer({ connection, layer: DISTRICT_LAYER, repoRoot });
}

/**
 * Rebuilds `plugins/mozambique/content/mz-adm1.csv` (provinces) and
 * `mz-adm2.csv` (districts) from geoBoundaries' humanitarian release of
 * Mozambique, which takes both levels from the same INE and OCHA source, so
 * every district lies inside exactly one province. Each file is simplified
 * only as far as it takes to stay under the plugin content size limit, and
 * the script prints each release's license, feature counts, and file sizes.
 * Run it with `pnpm vite-script scripts/plugins/buildMozambiqueBoundaries.ts`.
 */
async function main(): Promise<void> {
  const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
  const workDirectory = mkdtempSync(join(tmpdir(), "mozambique-boundaries-"));
  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();
  try {
    await _buildBoundaries({ connection, workDirectory, repoRoot });
  } finally {
    connection.closeSync();
    instance.closeSync();
    rmSync(workDirectory, { recursive: true, force: true });
  }
}

void main();
