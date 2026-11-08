import { getOptionalEnvVar } from "@pipelines/shared/getOptionalEnvVar/getOptionalEnvVar";
import { createSocrataListingDownload } from "@pipelines/socrata/download/createSocrataListingDownload/createSocrataListingDownload";
import { createSocrataHttpClient } from "@pipelines/socrata/createSocrataHttpClient/createSocrataHttpClient";

/**
 * The download script `socrata.pipeline.yaml` names: how the pipeline server
 * downloads one Socrata listing for its Parquet copy.
 */
export default createSocrataListingDownload({
  http: createSocrataHttpClient({
    appToken: getOptionalEnvVar("SOCRATA_APP_TOKEN"),
  }),
});
