import { runProcess } from "./runProcess";
import type { RunOptions } from "./MediaHelpers.types";
/** Runs a process without a shell and returns its standard output. */
export async function run({
  command,
  args,
  options = {},
}: Readonly<{
  command: string;
  args: string[];
  options?: RunOptions;
}>): Promise<string> {
  return (
    await runProcess({
      command,
      args,
      options,
    })
  ).stdout;
}
