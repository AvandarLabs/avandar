import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { buildCatalogFieldPathReader } from "@etl/EtlConfig/buildCatalogFieldPathReader/buildCatalogFieldPathReader";
import { coerceCatalogFieldValue } from "@etl/EtlConfig/coerceCatalogFieldValue/coerceCatalogFieldValue";
import type {
  CatalogFieldMappings,
  CatalogFieldSource,
  CatalogMappableField,
  PipelineConfig,
} from "@etl/EtlConfig/PipelineConfig.types";

/** What a mapper script receives besides the record. */
export type CatalogFieldScriptContext = Readonly<{
  /** The drive the record came from: its `baseUrl`. */
  driveKey: string;
  /** The field the script is filling. */
  field: CatalogMappableField;
}>;

/** A mapper script's default export. */
export type CatalogFieldScript = (
  record: unknown,
  context: CatalogFieldScriptContext,
) => unknown;

/**
 * The mapped fields, named as `RelationDescription` names them, so a
 * pipeline spreads them straight into a relation.
 */
export type CatalogMappedFields = Readonly<{
  description?: string;
  notes?: string;
  license?: string;
  updateFrequency?: string;
  canonicalUrls?: readonly string[];
  coverageStartDate?: Date;
  coverageEndDate?: Date;
  organization1Name?: string;
  organization2Name?: string;
  organization3Name?: string;
  organization4Name?: string;
  domains?: readonly string[];
  tags?: readonly string[];
}>;

/** A field that was left out of one record's mapping, and why. */
export type CatalogFieldMapProblem = Readonly<{
  field: CatalogMappableField;
  message: string;
}>;

/** One record's mapped fields, and the fields that could not be mapped. */
export type CatalogFieldMapResult = Readonly<{
  fields: CatalogMappedFields;
  problems: readonly CatalogFieldMapProblem[];
}>;

/** A pipeline config, compiled. Built once per run. */
export type CatalogFieldMapper = Readonly<{
  /**
   * Maps one source record from one drive. Synchronous: it reads no file
   * and imports nothing.
   *
   * @throws When `driveKey` is not a drive in the config.
   */
  mapFields: (record: unknown, driveKey: string) => CatalogFieldMapResult;
}>;

/** How a script module is imported. Replaced in tests to count imports. */
export type CatalogFieldScriptImporter = (url: string) => Promise<unknown>;

type _MappedFieldKey = keyof CatalogMappedFields;

const RELATION_KEY_BY_FIELD = {
  description: "description",
  notes: "notes",
  license: "license",
  update_frequency: "updateFrequency",
  canonical_urls: "canonicalUrls",
  coverage_start_date: "coverageStartDate",
  coverage_end_date: "coverageEndDate",
  organization1_name: "organization1Name",
  organization2_name: "organization2Name",
  organization3_name: "organization3Name",
  organization4_name: "organization4Name",
  domains: "domains",
  tags: "tags",
} as const satisfies Record<CatalogMappableField, _MappedFieldKey>;

/** One field of one drive, compiled to a function of the record. */
type _CompiledField = Readonly<{
  field: CatalogMappableField;
  /** Describes the source in a problem, such as `script ./x.ts`. */
  sourceLabel: string;
  read: (record: unknown, driveKey: string) => unknown;
}>;

const _importModule: CatalogFieldScriptImporter = async (url) => {
  return await import(/* @vite-ignore */ url);
};

function _listScriptPaths(config: PipelineConfig): readonly string[] {
  const allMappings: CatalogFieldMappings[] = [
    config.fields ?? {},
    ...config.drives.map((drive) => {
      return drive.fields ?? {};
    }),
  ];
  return allMappings.flatMap((mappings) => {
    return Object.values(mappings).flatMap((source) => {
      return source !== undefined && "script" in source ? [source.script] : [];
    });
  });
}

/**
 * Imports every distinct script the config names, once each, keyed by its
 * absolute path.
 */
async function _importScripts(args: {
  config: PipelineConfig;
  configDir: string;
  importScript: CatalogFieldScriptImporter;
}): Promise<ReadonlyMap<string, CatalogFieldScript>> {
  const absolutePaths = [
    ...new Set(
      _listScriptPaths(args.config).map((scriptPath) => {
        return resolve(args.configDir, scriptPath);
      }),
    ),
  ];
  const entries = await Promise.all(
    absolutePaths.map(async (absolutePath) => {
      const module = (await args.importScript(
        pathToFileURL(absolutePath).href,
      )) as { default?: unknown };
      if (typeof module.default !== "function") {
        throw new Error(
          `${absolutePath} must default-export a function (record, context) => value.`,
        );
      }
      return [absolutePath, module.default as CatalogFieldScript] as const;
    }),
  );
  return new Map(entries);
}

function _compileField(args: {
  field: CatalogMappableField;
  source: CatalogFieldSource;
  configDir: string;
  scripts: ReadonlyMap<string, CatalogFieldScript>;
}): _CompiledField {
  const { field, source } = args;
  if ("from" in source) {
    const readPath = buildCatalogFieldPathReader(source.from);
    return {
      field,
      sourceLabel: `from ${source.from}`,
      read: (record) => {
        return readPath(record);
      },
    };
  }
  if ("value" in source) {
    return {
      field,
      sourceLabel: "value",
      read: () => {
        return source.value;
      },
    };
  }
  const script = args.scripts.get(resolve(args.configDir, source.script));
  if (script === undefined) {
    throw new Error(`Script ${source.script} was not imported.`);
  }
  return {
    field,
    sourceLabel: `script ${source.script}`,
    read: (record, driveKey) => {
      return script(record, { driveKey, field });
    },
  };
}

function _readField(
  compiled: _CompiledField,
  record: unknown,
  driveKey: string,
): Readonly<{ value: unknown; problem?: string }> {
  try {
    return { value: compiled.read(record, driveKey) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      value: undefined,
      problem: `${compiled.sourceLabel} threw: ${message}`,
    };
  }
}

function _mapRecord(
  compiledFields: readonly _CompiledField[],
  record: unknown,
  driveKey: string,
): CatalogFieldMapResult {
  const fields: Partial<Record<_MappedFieldKey, unknown>> = {};
  const problems: CatalogFieldMapProblem[] = [];
  compiledFields.forEach((compiled) => {
    const read = _readField(compiled, record, driveKey);
    const coerced =
      read.problem === undefined
        ? coerceCatalogFieldValue({ field: compiled.field, value: read.value })
        : { value: undefined, problem: read.problem };
    if (coerced.problem !== undefined) {
      problems.push({ field: compiled.field, message: coerced.problem });
    }
    if (coerced.value !== undefined) {
      fields[RELATION_KEY_BY_FIELD[compiled.field]] = coerced.value;
    }
  });
  return { fields: fields as CatalogMappedFields, problems };
}

/**
 * Compiles a pipeline config into a mapper, once per run. Each `from` path
 * is split here, each drive's fields are merged over the pipeline's here,
 * and each distinct script is imported here, once, however many fields and
 * records use it. `mapFields` is then synchronous, so mapping 10,000
 * records never touches a file.
 *
 * Scripts are imported by `file://` URL, which both Bun (the pipeline
 * server) and vite-node (`ava pipeline run`) resolve the same way, and both
 * run `.ts` with no build step.
 *
 * @param args.config - The parsed pipeline config.
 * @param args.configDir - The config file's directory. Script paths are
 *   relative to it.
 * @param args.importScript - Replaces the module import, for tests.
 * @returns The mapper.
 * @throws When a script cannot be imported or does not default-export a
 * function.
 */
export async function loadCatalogFieldMapper(args: {
  config: PipelineConfig;
  configDir: string;
  importScript?: CatalogFieldScriptImporter;
}): Promise<CatalogFieldMapper> {
  const { config, configDir } = args;
  const scripts = await _importScripts({
    config,
    configDir,
    importScript: args.importScript ?? _importModule,
  });
  const compiledByDrive = new Map(
    config.drives.map((drive) => {
      const merged: CatalogFieldMappings = { ...config.fields, ...drive.fields };
      const compiledFields = Object.entries(merged).flatMap(
        ([field, source]) => {
          return source === undefined
            ? []
            : [
                _compileField({
                  field: field as CatalogMappableField,
                  source,
                  configDir,
                  scripts,
                }),
              ];
        },
      );
      return [drive.baseUrl, compiledFields] as const;
    }),
  );
  return {
    mapFields: (record, driveKey) => {
      const compiledFields = compiledByDrive.get(driveKey);
      if (compiledFields === undefined) {
        throw new Error(
          `${driveKey} is not a drive in this pipeline's config.`,
        );
      }
      return _mapRecord(compiledFields, record, driveKey);
    },
  };
}
