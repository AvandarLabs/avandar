import { getOptionalEnvVar } from "@pipelines/shared/getOptionalEnvVar/getOptionalEnvVar";
import { createSocrataHttpClient } from "@pipelines/socrata/createSocrataHttpClient/createSocrataHttpClient";
import { createSocrataListingDownload } from "@pipelines/socrata/download/createSocrataListingDownload/createSocrataListingDownload";

/**
 * The download script `socrata.pipeline.yaml` names: how the pipeline server
 * downloads one Socrata listing for its Parquet copy.
 */
export default createSocrataListingDownload({
  http: createSocrataHttpClient({
    appToken: getOptionalEnvVar("SOCRATA_APP_TOKEN"),
  }),
});
