import { promiseMap } from "@avandar/utils";
import { GhoDimensionIds } from "@pipelines/gho/GhoDimensionIds";
import { hasGhoFactSchema } from "@pipelines/gho/ghoFactColumns/ghoFactColumns";
import { match } from "ts-pattern";
import { z } from "zod";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types";
import type {
  GhoConnection,
  GhoCrawlDrive,
  GhoDimensionConnection,
  GhoIndicatorConnection,
  GhoScope,
} from "@pipelines/gho/gho.types";

/** Indicators or dimensions probed per page the engine loads. */
const DEFAULT_BATCH_SIZE = 50;

/**
 * The newest rows an indicator probe reads: GHO's `$top` limit. A
 * dimension a code column holds only in older rows is missed, which costs a
 * recommendation, never a wrong one.
 */
const PROBE_ROWS = 1000;

const PROBE_SELECT =
  "Date,SpatialDimType,Dim1Type,Dim2Type,Dim3Type,DataSourceDimType";

const IndicatorRecordSchema = z.object({
  IndicatorCode: z.string().min(1),
  IndicatorName: z.string(),
});

const DimensionRecordSchema = z.object({
  Code: z.string().min(1),
  Title: z.string(),
});

const RecordListSchema = z.object({ value: z.array(z.unknown()) });

const _nullableText = z
  .string()
  .nullish()
  .transform((value) => {
    return value ?? null;
  });

const IndicatorProbeSchema = z.object({
  "@odata.count": z.number().int().nonnegative(),
  value: z.array(
    z.object({
      Date: _nullableText,
      SpatialDimType: _nullableText,
      Dim1Type: _nullableText,
      Dim2Type: _nullableText,
      Dim3Type: _nullableText,
      DataSourceDimType: _nullableText,
    }),
  ),
});

type _ExtractArgs = Readonly<{
  drive: GhoCrawlDrive;
  http: OpenDataHttp;
}>;

/** Each record that fits `schema`, with the raw record. Others are warned. */
function _readRecords<TRecord>(
  body: unknown,
  schema: z.ZodType<TRecord>,
  label: string,
): Array<{ record: TRecord; sourceRecord: unknown }> {
  return RecordListSchema.parse(body).value.flatMap((sourceRecord) => {
    const parsed = schema.safeParse(sourceRecord);
    if (!parsed.success) {
      console.warn(`[gho] skipped a ${label} record: ${parsed.error.message}`);
      return [];
    }
    return [{ record: parsed.data, sourceRecord }];
  });
}

async function _probeIndicator(
  args: _ExtractArgs &
    Readonly<{
      record: z.infer<typeof IndicatorRecordSchema>;
      sourceRecord: unknown;
    }>,
): Promise<GhoIndicatorConnection> {
  const code = args.record.IndicatorCode;
  const probe = IndicatorProbeSchema.parse(
    await args.http.get(
      `${args.drive.baseUrl}/${code}?$orderby=Date%20desc&$top=${PROBE_ROWS}` +
        `&$select=${PROBE_SELECT}&$count=true`,
    ),
  );
  const hasFactSchema = hasGhoFactSchema(
    args.drive.indicatorSchemas.get(code) ?? [],
  );
  if (!hasFactSchema) {
    console.warn(
      `[gho] ${code}: its $metadata entity type differs from GHO_FACT_COLUMNS, so it is listed as not loadable`,
    );
  }
  return {
    kind: "indicator",
    code,
    name: args.record.IndicatorName,
    sourceRecord: args.sourceRecord,
    rowCount: probe["@odata.count"],
    probeRows: probe.value,
    hasFactSchema,
  };
}

async function _probeDimension(
  args: _ExtractArgs &
    Readonly<{
      record: z.infer<typeof DimensionRecordSchema>;
      sourceRecord: unknown;
    }>,
): Promise<GhoDimensionConnection> {
  const { Code: code, Title: title } = args.record;
  const values = RecordListSchema.parse(
    await args.http.get(
      `${args.drive.baseUrl}/${GhoDimensionIds.toApiResourceId(code)}`,
    ),
  ).value;
  return {
    kind: "dimension",
    code,
    title,
    sourceRecord: args.sourceRecord,
    valueCount: values.length,
  };
}

/** A probe that failed skips its one item, so one bad answer costs one row. */
async function _probeOrSkip<TItem>(
  item: TItem,
  args: Readonly<{
    code: string;
    probe: (item: TItem) => Promise<GhoConnection>;
  }>,
): Promise<GhoConnection[]> {
  try {
    return [await args.probe(item)];
  } catch (error) {
    console.warn(
      `[gho] skipped ${args.code}: its probe failed: ${String(error)}`,
    );
    return [];
  }
}

/**
 * Probes each batch's items at once and yields them in their listed order.
 * The GHO client's rate limiter decides how many requests actually run
 * together, so a batch never sends more than GHO is asked to take.
 */
async function* _probeInBatches<TItem>(
  args: Readonly<{
    items: readonly TItem[];
    batchSize: number;
    getCode: (item: TItem) => string;
    probe: (item: TItem) => Promise<GhoConnection>;
  }>,
): AsyncGenerator<readonly GhoConnection[]> {
  for (let start = 0; start < args.items.length; start += args.batchSize) {
    const batch = args.items.slice(start, start + args.batchSize);
    const probed = await promiseMap(batch, (item) => {
      return _probeOrSkip(item, {
        code: args.getCode(item),
        probe: args.probe,
      });
    });
    yield probed.flat();
  }
}

async function* _extractIndicators(
  args: _ExtractArgs & Readonly<{ batchSize: number }>,
): AsyncGenerator<readonly GhoConnection[]> {
  const items = _readRecords(
    await args.http.get(`${args.drive.baseUrl}/Indicator`),
    IndicatorRecordSchema,
    "GET /Indicator",
  );
  yield* _probeInBatches({
    items,
    batchSize: args.batchSize,
    getCode: (item) => {
      return item.record.IndicatorCode;
    },
    probe: (item) => {
      return _probeIndicator({ ...args, ...item });
    },
  });
}

async function* _extractDimensions(
  args: _ExtractArgs & Readonly<{ batchSize: number }>,
): AsyncGenerator<readonly GhoConnection[]> {
  const items = _readRecords(
    await args.http.get(`${args.drive.baseUrl}/Dimension`),
    DimensionRecordSchema,
    "GET /Dimension",
  );
  yield* _probeInBatches({
    items,
    batchSize: args.batchSize,
    getCode: (item) => {
      return item.record.Code;
    },
    probe: (item) => {
      return _probeDimension({ ...args, ...item });
    },
  });
}

/**
 * Lists one GHO scope and probes each of its items, one page per batch. A
 * batch's probes are sent together, so a run is not one request after
 * another: each takes about a second, and the GHO client runs up to eight
 * at once.
 *
 * The `indicators` scope reads `GET /Indicator`, then probes each indicator
 * for its row count and its 1,000 newest rows' `Date` and dimension type
 * columns, and checks its declared schema against `GHO_FACT_COLUMNS`,
 * warning when it differs. The `dimensions` scope reads `GET /Dimension`,
 * then reads each dimension's value list. A record that does not fit GHO's
 * shape, or whose probe fails, is skipped with a warning.
 *
 * GHO's lists carry no modified time, so every run reads them whole.
 *
 * @param args.drive - The drive as this run crawls it.
 * @param args.scope - Which scope to list.
 * @param args.http - The GHO client.
 * @param args.batchSize - Items probed per page. Defaults to 50.
 * @throws When `GET /Indicator` or `GET /Dimension` fails, or answers with
 * no `value` list.
 */
export function extractGhoDrive(
  args: _ExtractArgs & Readonly<{ scope: GhoScope; batchSize?: number }>,
): AsyncGenerator<readonly GhoConnection[]> {
  const extractArgs = {
    drive: args.drive,
    http: args.http,
    batchSize: args.batchSize ?? DEFAULT_BATCH_SIZE,
  };
  return match(args.scope.key)
    .with("indicators", () => {
      return _extractIndicators(extractArgs);
    })
    .with("dimensions", () => {
      return _extractDimensions(extractArgs);
    })
    .exhaustive();
}
