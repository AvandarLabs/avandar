import {
  Alert,
  Box,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useLingui } from "@lingui/react/macro";
import { IconAlertTriangle } from "@tabler/icons-react";
import css from "./PdfReviewGrid.module.css";
import type {
  BBox,
  ExtractedTable,
  PdfCellFlag,
} from "@/workers/pdfSniff/pdfSniff.types";
import type { ReactNode } from "react";

type Props = {
  table: ExtractedTable;
  onTableChange: (table: ExtractedTable) => void;
  onRowFocus: (provenance: { page: number; bbox: BBox }) => void;
};

/**
 * A flag with `rowIndex: -1` describes the whole region, not a cell.
 *
 * See `PdfCellFlag` in `src/workers/pdfSniff/pdfSniff.types.ts`. Everything that walks
 * the flag list has to split on this first, because reading `-1` as a
 * coordinate produces either a phantom flagged row in the counter or a
 * tooltip anchored to a cell that does not exist.
 */
function _isRegionFlag(flag: PdfCellFlag): boolean {
  return flag.rowIndex < 0;
}

/**
 * Editable view of one region's extraction, with uncertain cells marked.
 *
 * This component is the reason the feature can be trusted. Association by
 * position was measured at 14 of 16 correct against a real map, which is a
 * good first pass and an unacceptable silent import. Everything here exists to
 * make the two wrong ones findable: flags on the cells that were near-ties,
 * a count so the user knows how much is left, and a link from every row back
 * to where it sits on the page.
 */
export function PdfReviewGrid({
  table,
  onTableChange,
  onRowFocus,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const header = table.cells[0] ?? [];
  const dataRows = table.cells.slice(table.headerRows);

  const cellFlags = table.flags.filter((flag) => {
    return !_isRegionFlag(flag);
  });
  const regionFlags = table.flags.filter(_isRegionFlag);

  const flagFor = (
    rowIndex: number,
    columnIndex: number,
  ): string | undefined => {
    return cellFlags.find((flag) => {
      return flag.rowIndex === rowIndex && flag.columnIndex === columnIndex;
    })?.detail;
  };

  const flaggedRowCount = new Set(
    cellFlags.map((flag) => {
      return flag.rowIndex;
    }),
  ).size;

  const reportRowFocus = (rowIndex: number): void => {
    const provenance = table.rowProvenance[rowIndex];
    if (provenance) {
      onRowFocus(provenance);
    }
  };

  const editCell = (
    rowIndex: number,
    columnIndex: number,
    value: string,
  ): void => {
    const cells = table.cells.map((row) => {
      return [...row];
    });
    cells[rowIndex + table.headerRows]![columnIndex] = value;

    onTableChange({
      ...table,
      cells,
      // An edited row has been reviewed by definition, so its cell flags go.
      // Region-level flags survive: nothing about them was reviewed.
      flags: table.flags.filter((flag) => {
        return _isRegionFlag(flag) || flag.rowIndex !== rowIndex;
      }),
    });
  };

  return (
    <Stack gap="sm">
      {flaggedRowCount > 0 ?
        <Alert variant="light" color="yellow" icon={<IconAlertTriangle />}>
          <Text size="sm">
            {flaggedRowCount === 1 ?
              t`${flaggedRowCount} of ${dataRows.length} rows needs review. We matched these values to their labels by position, and these were close calls. Check them against the page.`
            : t`${flaggedRowCount} of ${dataRows.length} rows need review. We matched these values to their labels by position, and these were close calls. Check them against the page.`}
          </Text>
        </Alert>
      : null}

      {/*
       * The index here is a tiebreaker, not the identity. A flag carries no
       * id, and one region can legitimately raise two flags with the same
       * reason, so reason alone is not unique. These lists are derived fresh
       * from a static extraction result and never reorder or splice, which is
       * the case index keys are unsafe for.
       */}
      {regionFlags.map((flag, index) => {
        return (
          <Alert key={`${flag.reason}-${index}`} variant="light" color="gray">
            <Text size="xs">{flag.detail}</Text>
          </Alert>
        );
      })}

      <Box className={css.tableScroll}>
        <Table withTableBorder withColumnBorders striped>
          <Table.Thead>
            <Table.Tr>
              {header.map((name, columnIndex) => {
                return (
                  <Table.Th key={`${name}-${columnIndex}`}>{name}</Table.Th>
                );
              })}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {dataRows.map((row, rowIndex) => {
              return (
                <Table.Tr
                  key={rowIndex}
                  onClick={() => {
                    // Clicking anywhere in the row, not only into an input,
                    // is what makes the page highlight feel connected.
                    reportRowFocus(rowIndex);
                  }}
                >
                  {row.map((value, columnIndex) => {
                    const flag = flagFor(rowIndex, columnIndex);
                    const input = (
                      <TextInput
                        size="xs"
                        variant="unstyled"
                        aria-label={t`Row ${rowIndex + 1}, ${
                          header[columnIndex] ?? t`column ${columnIndex + 1}`
                        }`}
                        value={value}
                        error={Boolean(flag)}
                        onChange={(event) => {
                          editCell(
                            rowIndex,
                            columnIndex,
                            event.currentTarget.value,
                          );
                        }}
                        onFocus={() => {
                          // Keyboard tabbing never fires the row's click.
                          reportRowFocus(rowIndex);
                        }}
                      />
                    );
                    return (
                      <Table.Td key={columnIndex}>
                        {flag ?
                          <Tooltip label={flag} multiline w={260}>
                            <div>{input}</div>
                          </Tooltip>
                        : input}
                      </Table.Td>
                    );
                  })}
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Box>

      {/*
       * The tooltips above are hover-only, so the same details are listed
       * here where a keyboard or screen-reader user can actually reach them.
       */}
      {cellFlags.map((flag) => {
        return (
          <Text
            key={`${flag.rowIndex}-${flag.columnIndex}-${flag.reason}`}
            size="xs"
            c="dimmed"
          >
            {t`Row ${flag.rowIndex + 1}: ${flag.detail}`}
          </Text>
        );
      })}
    </Stack>
  );
}
