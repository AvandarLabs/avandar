import { createServiceClient } from "@clients/index";
import { withQueryHooks } from "@hooks/withQueryHooks/withQueryHooks";

export const SourceDatasetClient = withQueryHooks(
  createServiceClient("SourceDatasetClient").mixin(() => {
    return {
      members: {
        getSourceDataset: () => {
          return Promise.resolve("this is a test");
        },
      },
    };
  }),
  {
    queryFns: ["getSourceDataset"],
    mutationFns: [],
  },
);
