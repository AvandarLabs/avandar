import { createGhoListingDownload } from "@pipelines/gho/download/createGhoListingDownload/createGhoListingDownload";

/**
 * The download script `gho.pipeline.yaml` names: how the pipeline server
 * downloads one GHO listing for its Parquet copy.
 */
export default createGhoListingDownload();
