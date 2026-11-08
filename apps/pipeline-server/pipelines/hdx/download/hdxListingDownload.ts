import { createHdxListingDownload } from "@pipelines/hdx/download/createHdxListingDownload/createHdxListingDownload";
import { createHdxHttpClient } from "@pipelines/hdx/createHdxHttpClient/createHdxHttpClient";

/**
 * The download script `hdx.pipeline.yaml` names: how the pipeline server
 * downloads one HDX listing for its Parquet copy.
 */
export default createHdxListingDownload({
  createHttp: (baseUrl) => {
    return createHdxHttpClient({ baseUrl });
  },
});
