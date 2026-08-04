#!/usr/bin/env node
/**
 * Generates large CSV and XLSX test files by duplicating the COVID
 * sample dataset until each file is at least the target size in MB.
 *
 * Usage:
 *   node scripts/generate-large-test-files.ts \
 *     [--target-mb=420] [--out-dir=tests/data/large]
 *
 * The output files are gitignored so they are never committed.
 */
import { createWriteStream, mkdirSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CellValue } from "exceljs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(scriptDir, "..");

// Parse `--key=value` and bare `--flag` args into a string record; bare flags
// map to "true". Kept inline (rather than a shared helper) because Node's
// direct TS execution needs a `.ts` import extension that the repo lint rules
// reject for relative imports.
const args: Record<string, string> = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((arg) => {
      return arg.startsWith("--");
    })
    .map((arg) => {
      const [flagName, flagValue] = arg.replace(/^--/, "").split("=");
      return [flagName, flagValue ?? "true"];
    }),
);

const TARGET_MB = Number.parseInt(args["target-mb"] ?? "420", 10);
const OUT_DIR = join(ROOT, args["out-dir"] ?? "tests/data/large");
const SRC_CSV = join(ROOT, "tests/data/california-covid-sample/california-covid-sample.csv");
const SRC_XLSX = join(ROOT, "tests/data/california-covid-sample/california-covid-sample.xlsx");

mkdirSync(OUT_DIR, { recursive: true });

const targetBytes = TARGET_MB * 1024 * 1024;
const outCsv = join(OUT_DIR, `california-covid-${TARGET_MB}mb.csv`);
const outXlsx = join(OUT_DIR, `california-covid-${TARGET_MB}mb.xlsx`);

console.log(
  `Target size: ${TARGET_MB} MB (${targetBytes.toLocaleString()} bytes)`,
);
console.log(`Output dir:  ${OUT_DIR}`);

/**
 * Streams the CSV header once, then repeats the source body until the file
 * reaches the target size. Writes are back-pressure aware so memory stays flat.
 */
async function generateCsv(): Promise<void> {
  console.log(`\n[CSV] Reading source: ${SRC_CSV}`);
  const text = await readFile(SRC_CSV, "utf8");
  const newlineIdx = text.indexOf("\n");
  const header = text.slice(0, newlineIdx + 1); // include the newline
  let body = text.slice(newlineIdx + 1);
  // The source body may or may not end with a newline. Without one,
  // repeated body copies splice together (last row of repeat N runs
  // into the first row of repeat N+1) and DuckDB's CSV sniffer rejects
  // the whole file with "could not detect dialect". Force a trailing \n.
  if (!body.endsWith("\n")) {
    body = body + "\n";
  }
  const bodyBytes = Buffer.byteLength(body, "utf8");
  const headerBytes = Buffer.byteLength(header, "utf8");

  const repeats = Math.ceil((targetBytes - headerBytes) / bodyBytes);
  console.log(
    `[CSV] body=${bodyBytes.toLocaleString()} bytes, repeats=${repeats}`,
  );

  const out = createWriteStream(outCsv);
  out.write(header);

  // Write the body in chunks of N repeats at a time to avoid one massive
  // string allocation; back-pressure aware. Each write is awaited in
  // sequence, so this stays an imperative loop rather than a functional map.
  const CHUNK_REPEATS = 32;
  const chunk = body.repeat(CHUNK_REPEATS);
  let written = 0;
  while (written < repeats) {
    const remaining = repeats - written;
    const batch = remaining < CHUNK_REPEATS ? body.repeat(remaining) : chunk;
    const needsDrain = !out.write(batch);
    if (needsDrain) {
      await new Promise<void>((resolve) => {
        out.once("drain", resolve);
      });
    }
    written += remaining < CHUNK_REPEATS ? remaining : CHUNK_REPEATS;
  }
  await new Promise<void>((resolve) => {
    out.end(resolve);
  });
  const outStat = statSync(outCsv);
  console.log(
    `[CSV] Wrote ${outCsv}: ${(outStat.size / 1024 / 1024).toFixed(1)} MB`,
  );
}

/**
 * Streams rows into an XLSX file via exceljs's WorkbookWriter so the workbook
 * is never fully materialized in memory. Rows flush into the on-disk zip as
 * they commit.
 */
async function generateXlsx(): Promise<void> {
  console.log(`\n[XLSX] Reading source: ${SRC_XLSX}`);
  const exceljsModule = await import("exceljs");
  const ExcelJS = exceljsModule.default ?? exceljsModule;

  // Pull the header + body rows out of the source workbook (small file,
  // fine to load whole).
  const srcWb = new ExcelJS.Workbook();
  await srcWb.xlsx.readFile(SRC_XLSX);
  const srcWs = srcWb.worksheets[0];
  if (!srcWs) {
    throw new Error(`Source workbook has no worksheets: ${SRC_XLSX}`);
  }
  const sheetName = srcWs.name;
  // exceljs `.values` is a 1-based array for these sheets; index 0 is empty.
  const header = (srcWs.getRow(1).values as CellValue[]).slice(1);
  const bodyRowCount = srcWs.rowCount - 1;
  const body = Array.from({ length: bodyRowCount }, (_unused, idx) => {
    return (srcWs.getRow(idx + 2).values as CellValue[]).slice(1);
  });
  console.log(`[XLSX] header cols=${header.length}, body rows=${body.length}`);

  // XLSX is zip-compressed. With sharedStrings disabled and the streaming
  // writer, our COVID sample lands at ~36 bytes/row on disk (measured;
  // much smaller than the source's ~242 bytes/row because the source
  // workbook carries a lot of unused style/shared-string overhead).
  const measuredBytesPerBodyRow = 36;
  const targetRows = Math.ceil(targetBytes / measuredBytesPerBodyRow);
  const repeats = Math.ceil(targetRows / body.length);
  console.log(
    `[XLSX] target rows ≈ ${targetRows.toLocaleString()} (repeats=${repeats})`,
  );

  const outWb = new ExcelJS.stream.xlsx.WorkbookWriter({
    filename: outXlsx,
    useStyles: false,
    useSharedStrings: false,
  });
  const outWs = outWb.addWorksheet(sheetName);
  outWs.addRow(header).commit();
  // This writes millions of rows for large targets, so the imperative repeat
  // loop stays: each addRow(...).commit() flushes to the on-disk zip and the
  // row volume is far past the point where an extra functional pass matters.
  for (let repeatIdx = 0; repeatIdx < repeats; repeatIdx++) {
    body.forEach((row) => {
      outWs.addRow(row).commit();
    });
    if ((repeatIdx + 1) % 10 === 0) {
      const percentDone = (((repeatIdx + 1) / repeats) * 100).toFixed(0);
      const rowsDone = ((repeatIdx + 1) * body.length).toLocaleString();
      console.log(`[XLSX] ${percentDone}% (${rowsDone} rows)`);
    }
  }
  outWs.commit();
  await outWb.commit();

  const outStat = statSync(outXlsx);
  console.log(
    `[XLSX] Wrote ${outXlsx}: ${(outStat.size / 1024 / 1024).toFixed(1)} MB`,
  );
}

if (args.skipCsv !== "true") {
  await generateCsv();
}
if (args.skipXlsx !== "true") {
  await generateXlsx();
}

console.log("\nDone.");
