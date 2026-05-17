import { Tooltip } from "@mantine/core";
import {
  IconBrandGoogle,
  IconFileTypeCsv,
  IconFileTypeXls,
  IconTable,
  IconWorld,
} from "@tabler/icons-react";
import { match } from "ts-pattern";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";

export function SourceBadge({
  sourceType,
  sourceName,
  size = 18,
}: {
  sourceType?: DatasetSource.SourceType;
  sourceName?: string;
  size?: number;
}): JSX.Element | null {
  if (!sourceType) return null;

  const { Icon, tooltip } = match(sourceType)
    .with("csv_file", () => {
      return {
        Icon: (props: React.ComponentProps<typeof IconFileTypeCsv>) => {
          return <IconFileTypeCsv {...props} color="#666" />;
        },
        tooltip: "From CSV",
      };
    })
    .with("xlsx_file", () => {
      return {
        Icon: (props: React.ComponentProps<typeof IconFileTypeXls>) => {
          return <IconFileTypeXls {...props} color="#666" />;
        },
        tooltip: "From Excel",
      };
    })
    .with("google_sheets", () => {
      return {
        Icon: (props: React.ComponentProps<typeof IconBrandGoogle>) => {
          return <IconBrandGoogle {...props} color="#34a853" />;
        },
        tooltip: "From Google Sheets",
      };
    })
    .with("virtual", () => {
      return {
        Icon: (props: React.ComponentProps<typeof IconTable>) => {
          return <IconTable {...props} color="#999" />;
        },
        tooltip: "From derived dataset",
      };
    })
    .with("open_data", () => {
      return {
        Icon: (props: React.ComponentProps<typeof IconWorld>) => {
          return <IconWorld {...props} color="#0072ce" />;
        },
        tooltip: "From Open Data",
      };
    })
    .exhaustive(() => {
      return {
        Icon: (props: React.ComponentProps<typeof IconTable>) => {
          return <IconTable {...props} color="#999" />;
        },
        tooltip: "From dataset",
      };
    });

  const label = sourceName ? `${tooltip} (${sourceName})` : tooltip;

  return (
    <Tooltip label={label} withArrow>
      <Icon size={size} />
    </Tooltip>
  );
}
