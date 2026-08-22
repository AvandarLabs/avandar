import { useLingui } from "@lingui/react/macro";
import { Tooltip } from "@mantine/core";
import {
  IconBrandGoogle,
  IconFileTypeCsv,
  IconFileTypePdf,
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
  const { t } = useLingui();
  if (!sourceType) return null;

  const { Icon, tooltip } = match(sourceType)
    .with("csv_file", () => {
      return {
        Icon: (props: React.ComponentProps<typeof IconFileTypeCsv>) => {
          return <IconFileTypeCsv {...props} color="#666" />;
        },
        tooltip: t`From CSV`,
      };
    })
    .with("xlsx_file", () => {
      return {
        Icon: (props: React.ComponentProps<typeof IconFileTypeXls>) => {
          return <IconFileTypeXls {...props} color="#666" />;
        },
        tooltip: t`From Excel`,
      };
    })
    .with("google_sheets", () => {
      return {
        Icon: (props: React.ComponentProps<typeof IconBrandGoogle>) => {
          return <IconBrandGoogle {...props} color="#34a853" />;
        },
        tooltip: t`From Google Sheets`,
      };
    })
    .with("virtual", () => {
      return {
        Icon: (props: React.ComponentProps<typeof IconTable>) => {
          return <IconTable {...props} color="#999" />;
        },
        tooltip: t`From derived dataset`,
      };
    })
    .with("open_data", () => {
      return {
        Icon: (props: React.ComponentProps<typeof IconWorld>) => {
          return <IconWorld {...props} color="#0072ce" />;
        },
        tooltip: t`From Open Data`,
      };
    })
    .with("pdf_file", () => {
      return {
        Icon: (props: React.ComponentProps<typeof IconFileTypePdf>) => {
          return <IconFileTypePdf {...props} color="#666" />;
        },
        tooltip: t`From PDF`,
      };
    })
    .exhaustive(() => {
      return {
        Icon: (props: React.ComponentProps<typeof IconTable>) => {
          return <IconTable {...props} color="#999" />;
        },
        tooltip: t`From dataset`,
      };
    });

  const label = sourceName ? `${tooltip} (${sourceName})` : tooltip;

  return (
    <Tooltip label={label} withArrow>
      <Icon size={size} />
    </Tooltip>
  );
}
