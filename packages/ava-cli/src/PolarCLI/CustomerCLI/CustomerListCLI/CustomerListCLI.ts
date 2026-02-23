import { Acclimate } from "@avandar/acclimate";
import { printError, printInfo } from "../../../utils/cliOutput";
import { createPolarCLIClient } from "../../PolarClient";
import { listCustomers } from "../../PolarClient/polarHelpers";

type PrintableColumn = {
  key: string;
  label: string;
  width: number;
};

function _formatColumnName(column: string): string {
  // capitalize the first letter and replace underscores and hyphens
  // with spaces
  const formatted =
    column.charAt(0).toUpperCase() + column.slice(1).replace(/[-_]/g, " ");

  // now convert any PascalCase to space-separated "Pascal Case"
  return formatted.replace(/([A-Z])/g, " $1").trim();
}

const CELL_LEFT_PADDING = 1;
const CELL_RIGHT_PADDING = 1;

function _padTableCellValue({
  str,
  width,
}: {
  str: string;
  width: number;
}): string {
  const trailingSpaces = " ".repeat(width - str.length);
  const leftPadding = " ".repeat(CELL_LEFT_PADDING);
  const rightPadding = " ".repeat(CELL_RIGHT_PADDING);
  return `${leftPadding}${str}${trailingSpaces}${rightPadding}`;
}

function _printTable(
  rows: ReadonlyArray<Record<string, string>>,
  {
    emptyMessage = "Table is empty.",
    headers,
  }: {
    emptyMessage?: string;

    // optionally pass in a hardcoded list of headers if you want to ensure
    // a stable order
    headers?: string[];
  } = {},
): void {
  if (rows.length === 0) {
    Acclimate.log(`|yellow|${emptyMessage}`);
    return;
  }
  const headerKeys = headers ?? Object.keys(rows[0]!);
  const columnMeta = {} as Record<string, PrintableColumn>;

  // first, let's generate the column metadata objects, to determine the column
  // widths based on the row content
  rows.forEach((row) => {
    headerKeys.forEach((header) => {
      const cellValue = row[header];
      if (cellValue === undefined) {
        // this header doesn't exist in this row, so we skip it
        return;
      }

      // initialize column object or (if it already exists) see if we need to
      // update its width
      if (!columnMeta[header]) {
        columnMeta[header] = {
          key: header,
          label: _formatColumnName(header),
          width: Math.max(cellValue.length, header.length),
        };
      }

      const column = columnMeta[header];
      // increase column width if we need to
      column.width = Math.max(column.width, cellValue.length);
    });
  });

  // now we can print the table now that we have all column widths
  const columnsToPrint = headerKeys
    .map((header) => {
      return columnMeta[header];
    })
    .filter((column) => {
      return column !== undefined;
    });

  const fullHeaderString = columnsToPrint
    .map(({ label, width }) => {
      return _padTableCellValue({ str: label, width });
    })
    .join("|");

  const headerSeparator = columnsToPrint
    .map(({ width }) => {
      return (
        "-".repeat(CELL_LEFT_PADDING) +
        "-".repeat(width) +
        "-".repeat(CELL_RIGHT_PADDING)
      );
    })
    .join("+");

  const fullRowsString = rows
    .map((row) => {
      return columnsToPrint
        .map(({ key, width }) => {
          return _padTableCellValue({ str: row[key] ?? "", width });
        })
        .join("|");
    })
    .join("\n");

  Acclimate.log("|yellow|$header$\n$separator$|reset|\n$rows$", {
    header: fullHeaderString,
    separator: headerSeparator,
    rows: fullRowsString,
  });
}

/**
 * Create a test customer and subscribe them to the Free plan.
 *
 * If the customer already has a Free plan subscription we will do nothing.
 */
export async function runCustomerList({
  withIds,
  withCreatedAt,
}: {
  withIds: boolean;
  withCreatedAt: boolean;
}): Promise<void> {
  try {
    printInfo("Connecting to Polar...");
    const { polar, organizationId } = await createPolarCLIClient();

    printInfo("Retrieving existing customers");
    const customers = await listCustomers({ polar, organizationId });

    const formattedCustomers = customers
      .sort((a, b) => {
        return a.createdAt.getTime() - b.createdAt.getTime();
      })
      .map((customer, idx) => {
        return {
          "#": String(idx + 1), // 1-indexed
          name: customer.name ?? "null",
          email: customer.email,
          ...(withIds ? { id: customer.id } : {}),
          ...(withCreatedAt ?
            { createdAt: customer.createdAt.toISOString() }
          : {}),
        };
      });

    _printTable(formattedCustomers, {
      emptyMessage: "No customers found.",
      headers: ["#", "id", "createdAt", "name", "email"],
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    printError("Failed to list Polar customers");
    printError(errorMessage);
    printError(
      "Verify .env.development contains POLAR_ACCESS_TOKEN and " +
        "POLAR_SERVER_TYPE.",
    );
    throw error;
  }
}

/** List all customers in Polar */
export const CustomerListCLI = Acclimate.createCLI("list")
  .description(
    "List all customers in Polar. By default only lists emails and names. Use options to add other columns.",
  )
  .addOption({
    name: "--with-ids",
    aliases: ["-id"],
    description: "Include the customer ID in the output.",
    type: "boolean",
    required: false,
    default: false,
  })
  .addOption({
    name: "--with-created-at",
    aliases: ["-date"],
    description: "Include the customer created at in the output.",
    type: "boolean",
    required: false,
    default: false,
  })
  .action(runCustomerList);
