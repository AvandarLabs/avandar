import { createHdxHttpClient } from "@pipelines/hdx/createHdxHttpClient/createHdxHttpClient";
import { createHdxListingDownload } from "@pipelines/hdx/download/createHdxListingDownload/createHdxListingDownload";

/**
 * The download script `hdx.pipeline.yaml` names: how the pipeline server
 * downloads one HDX listing for its Parquet copy.
 */
export default createHdxListingDownload({
  createHttp: (baseUrl) => {
    return createHdxHttpClient({ baseUrl });
  },
});
