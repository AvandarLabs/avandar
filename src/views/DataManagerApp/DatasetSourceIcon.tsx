import {
  IconBrandGoogleDrive,
  IconFileTypeCsv,
  IconFileTypePdf,
  IconFileTypeXls,
  IconMathFunction,
  IconWorldSearch,
} from "@tabler/icons-react";
import { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import type { Icon } from "@tabler/icons-react";
import type { ReactNode } from "react";

const SOURCE_TYPE_ICONS: Record<DatasetSource.SourceType, Icon> = {
  csv_file: IconFileTypeCsv,
  google_sheets: IconBrandGoogleDrive,
  open_data: IconWorldSearch,
  pdf_file: IconFileTypePdf,
  virtual: IconMathFunction,
  xlsx_file: IconFileTypeXls,
};

type Props = {
  sourceType: DatasetSource.SourceType;
  size?: number;
};

/**
 * The mark for a dataset's origin. Drawn from one icon set at one stroke
 * weight so a list of mixed sources reads as a single vocabulary.
 *
 * It is decorative wherever it appears: every row that carries it also
 * carries the dataset's name, and the source type is named in words in the
 * group heading above it and in the detail view's fact line.
 */
export function DatasetSourceIcon({
  sourceType,
  size = 16,
}: Readonly<Props>): ReactNode {
  const IconComponent = SOURCE_TYPE_ICONS[sourceType];
  return <IconComponent size={size} stroke={1.6} aria-hidden />;
}
