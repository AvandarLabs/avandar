import type { UnknownObject } from "@avandar/utils";

/**
 * Reads a `File`'s text. jsdom's `File` has no `text()`, so this goes through
 * `FileReader`, which jsdom does implement. Reading the real `File` the view
 * built, rather than the string handed to the export mock, is the point: it
 * proves the CSV survives being wrapped for the local import mutation.
 */
export async function readFileText(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(String(reader.result));
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("Could not read the CSV File"));
    };
    reader.readAsText(file);
  });
}

/** Parses CSV text the way the real DuckDB CSV sniff does, near enough. */
export async function sniffCsvFile(file: File): Promise<{
  columns: Array<{ column_name: string; column_type: string }>;
  previewRows: UnknownObject[];
  csvSniff: UnknownObject;
}> {
  const text = await readFileText(file);
  const [headerLine, ...rowLines] = text.trim().split("\n");
  const columnNames = (headerLine ?? "").split(",");
  const previewRows = rowLines.map((line) => {
    const cells = line.split(",");
    return Object.fromEntries(
      columnNames.map((name, index) => {
        return [name, cells[index]];
      }),
    ) as UnknownObject;
  });
  return {
    columns: columnNames.map((name) => {
      return { column_name: name, column_type: "VARCHAR" };
    }),
    previewRows,
    csvSniff: {
      Delimiter: ",",
      Quote: '"',
      Escape: '"',
      NewLineDelimiter: "\n",
      Comment: "#",
      SkipRows: 0,
      HasHeader: true,
      Columns: [],
      DateFormat: null,
      TimestampFormat: null,
      UserArguments: "",
      Prompt: "",
      table_name: "sniffed",
    } as UnknownObject,
  };
}
