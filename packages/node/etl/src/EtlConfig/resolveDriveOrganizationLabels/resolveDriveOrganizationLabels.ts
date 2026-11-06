import type {
  PipelineConfig,
  PipelineDriveConfig,
} from "@etl/EtlConfig/PipelineConfig.types";
import type { EtlOrganizationLabels } from "@etl/EtlEngine/EtlEngine.types";

/**
 * One drive's organization labels: its own when it sets any, otherwise the
 * pipeline's. A drive's labels replace the pipeline's whole, so a drive
 * never shows a label for a level it does not fill.
 *
 * @param args.config - The pipeline config.
 * @param args.drive - One of its drives.
 * @returns The labels, possibly empty.
 */
export function resolveDriveOrganizationLabels(args: {
  config: PipelineConfig;
  drive: PipelineDriveConfig;
}): EtlOrganizationLabels {
  return args.drive.organizationLabels ?? args.config.organizationLabels ?? {};
}
