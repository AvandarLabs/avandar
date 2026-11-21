/** Native producer command preparation and failure reporting. */
export const ProducerCli: Readonly<{
  prepare(
    input: Readonly<{ commandName: string; moduleUrl: string }>,
  ): Promise<void>;
  failure(commandName: string, error: unknown): void;
}>;
