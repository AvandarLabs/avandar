#!/usr/bin/env node
/**
 * Generates large CSV and XLSX test files by duplicating the COVID
 * sample dataset until each file is at least the target size in MB.
 *
 * Usage:
 *   node scripts/generate-large-test-files.mjs \
 *     [--target-mb=420] [--out-dir=tests/data/large]
 *
 * The output files are gitignored so they are never committed.
 */
import { createWriteStream, mkdirSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((arg) => arg.startsWith("--"))
    .map((arg) => {
      const [k, v] = arg.replace(/^--/, "").split("=");
      return [k, v ?? "true"];
    }),
);

const TARGET_MB = Number.parseInt(args["target-mb"] ?? "420", 10);
const OUT_DIR = join(ROOT, args["out-dir"] ?? "tests/data/large");
const SRC_CSV = join(ROOT, "tests/data/california-covid-sample.csv");
const SRC_XLSX = join(ROOT, "tests/data/california-covid-sample.xlsx");

mkdirSync(OUT_DIR, { recursive: true });

const targetBytes = TARGET_MB * 1024 * 1024;
const outCsv = join(OUT_DIR, `california-covid-${TARGET_MB}mb.csv`);
const outXlsx = join(OUT_DIR, `california-covid-${TARGET_MB}mb.xlsx`);

console.log(
  `Target size: ${TARGET_MB} MB (${targetBytes.toLocaleString()} bytes)`,
);
console.log(`Output dir:  ${OUT_DIR}`);

// === CSV: stream the header once, then repeat the body until target. ===
async function generateCsv() {
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
  // string allocation; back-pressure aware.
  const CHUNK_REPEATS = 32;
  const chunk = body.repeat(CHUNK_REPEATS);
  let written = 0;
  while (written < repeats) {
    const remaining = repeats - written;
    if (remaining < CHUNK_REPEATS) {
      const drain = !out.write(body.repeat(remaining));
      if (drain) await new Promise((r) => out.once("drain", r));
      written += remaining;
    } else {
      const drain = !out.write(chunk);
      if (drain) await new Promise((r) => out.once("drain", r));
      written += CHUNK_REPEATS;
    }
  }
  await new Promise((r) => out.end(r));
  const stat = statSync(outCsv);
  console.log(
    `[CSV] Wrote ${outCsv}: ${(stat.size / 1024 / 1024).toFixed(1)} MB`,
  );
}

// === XLSX: stream rows via exceljs WorkbookWriter so the workbook is never
// fully materialized in memory. Rows flush into the on-disk zip as they
// commit. ===
async function generateXlsx() {
  console.log(`\n[XLSX] Reading source: ${SRC_XLSX}`);
  const ExcelJS =
    (await import("exceljs")).default ?? (await import("exceljs"));

  // Pull the header + body rows out of the source workbook (small file,
  // fine to load whole).
  const srcWb = new ExcelJS.Workbook();
  await srcWb.xlsx.readFile(SRC_XLSX);
  const srcWs = srcWb.worksheets[0];
  const sheetName = srcWs.name;
  // exceljs `.values` is 1-based; index 0 is always empty.
  const header = srcWs.getRow(1).values.slice(1);
  const body = [];
  for (let r = 2; r <= srcWs.rowCount; r++) {
    body.push(srcWs.getRow(r).values.slice(1));
  }
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
  for (let i = 0; i < repeats; i++) {
    for (let j = 0; j < body.length; j++) {
      outWs.addRow(body[j]).commit();
    }
    if ((i + 1) % 10 === 0) {
      const pct = (((i + 1) / repeats) * 100).toFixed(0);
      console.log(
        `[XLSX] ${pct}% (${((i + 1) * body.length).toLocaleString()} rows)`,
      );
    }
  }
  outWs.commit();
  await outWb.commit();

  const stat = statSync(outXlsx);
  console.log(
    `[XLSX] Wrote ${outXlsx}: ${(stat.size / 1024 / 1024).toFixed(1)} MB`,
  );
}

if (args.skipCsv !== "true") await generateCsv();
if (args.skipXlsx !== "true") await generateXlsx();

console.log("\nDone.");
