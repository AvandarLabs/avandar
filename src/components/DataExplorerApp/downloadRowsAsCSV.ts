import { objectKeys } from "$/lib/utils/objects/objectKeys/objectKeys";
import { unknownToString } from "$/lib/utils/strings/unknownToString";
import { UnknownRow } from "@/clients/DuckDBClient";

// Helper to escape fields for CSV
function _escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const str = unknownToString(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    // Escape double quotes
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * This function assumes that all objects in the array have the same keys.
 * We will only check the first object in the array to get the headers.
 */
export function downloadRowsAsCSV(data: UnknownRow[]): void {
  if (!data || data.length === 0) {
    // Nothing to export
    return;
  }

  // Get CSV header from object keys (use all unique keys in all rows)
  const firstRow = data[0]!;
  const headers = [...new Set(objectKeys(firstRow))];
  const csvRows = [
    headers.join(","),
    ...data.map((row) => {
      return headers
        .map((h) => {
          return _escapeCSVValue(row[h]);
        })
        .join(",");
    }),
  ];
  const csvContent = csvRows.join("\r\n");

  // Trigger download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "export.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
