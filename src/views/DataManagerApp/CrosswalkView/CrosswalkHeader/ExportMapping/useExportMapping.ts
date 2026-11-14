import { useLingui } from "@lingui/react/macro";
import Papa from "papaparse";
import { useMemo } from "react";
import { buildMappingCsvRows } from "@/lib/crosswalks/buildMappingCsvRows/buildMappingCsvRows";
import { downloadTextFile } from "@/views/DataManagerApp/CrosswalkView/CrosswalkHeader/ExportMapping/downloadTextFile";
import { useMappingCsvCopy } from "@/views/DataManagerApp/CrosswalkView/CrosswalkHeader/ExportMapping/useMappingCsvCopy";
import { getLayoutLabel } from "@/views/DataManagerApp/CrosswalkView/layoutLabel/getLayoutLabel";
import type { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type { CrosswalkContext } from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";

/** A byte order mark, so spreadsheet apps read the file as UTF-8. */
const UTF8_BOM = "\uFEFF";

/** Runs of characters a file name cannot hold on common systems. */
const UNSAFE_FILE_NAME_CHARACTERS = /[\\/:*?"<>|\p{Cc}]+/gu;

/** Every code list name the user can read, by code list id. */
function _getCodeListNamesById(
  entriesById: ReadonlyMap<string, DictionaryMatch.Entry>,
): Map<string, string> {
  return new Map(
    [...entriesById.values()].flatMap((entry) => {
      return entry.codeLists.map((codeList) => {
        return [codeList.id, codeList.name] as const;
      });
    }),
  );
}

function _toCsvFileName(baseName: string): string {
  return `${baseName.replace(UNSAFE_FILE_NAME_CHARACTERS, "-").trim()}.csv`;
}

/** Export mapping's action, and whether there is anything to export. */
export type ExportMapping = {
  exportMapping: () => void;
  /** False while the crosswalk has no readable dataset. */
  canExport: boolean;
};

/**
 * Downloads the crosswalk's mapping as a CSV named "<crosswalk> mapping",
 * one row per dataset and column of the combined dataset, translated. It
 * reads the draft, so unsaved edits are exported as shown. A value that
 * starts like a spreadsheet formula is escaped.
 */
export function useExportMapping(
  options: Readonly<{ draft: CrosswalkDraft.T; context: CrosswalkContext }>,
): ExportMapping {
  const { t } = useLingui();
  const copy = useMappingCsvCopy();
  const { draft, context } = options;
  const rows = useMemo(() => {
    return buildMappingCsvRows({
      draft,
      datasetsById: context.datasetsById,
      codeListNamesById: _getCodeListNamesById(context.entriesById),
      nameLayout: (datasetIds) => {
        // The builder passes only readable datasets, at least one.
        return (
          getLayoutLabel({ datasetIds }, context.datasetsById)
            .firstDatasetName ?? ""
        );
      },
    });
  }, [draft, context.datasetsById, context.entriesById]);
  const exportMapping = (): void => {
    const csv = Papa.unparse(
      { fields: copy.headers, data: rows.map(copy.toCells) },
      { escapeFormulae: true },
    );
    const crosswalkName = draft.name;
    downloadTextFile({
      text: `${UTF8_BOM}${csv}`,
      fileName: _toCsvFileName(t`${crosswalkName} mapping`),
      mimeType: "text/csv;charset=utf-8",
    });
  };
  return { exportMapping, canExport: rows.length > 0 };
}
