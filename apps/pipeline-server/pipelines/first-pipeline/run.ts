import { ETLEngine } from "@etl-engine/ETLEngine/ETLEngine";

export const Pipeline = ETLEngine.create({
  name: "WDI",
  extract: async () => {
    return {
      pipelineRunId: "123",
      files: [],
      context: {},
    };
  },
  transform: async (extractedDataContext) => {
    return {
      path: "123",
      columns: [],
    };
  },
  load: async (parquetBlobs) => {
    return;
  },
});

export async function run(): Promise<string> {
  const { pipelineRunId } = await WDI_ETLEngine.run();
  return pipelineRunId;
}
