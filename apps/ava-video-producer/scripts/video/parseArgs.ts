import { COMMANDS, HELP } from "./video.constants";
import type { Command, Options } from "./video.types";

/**
 * Parse the intentionally small CLI without shell evaluation or implicit flags.
 */
export function parseArgs(argv: string[]): Options {
  const [command, filename, ...rest] = argv;
  if (!COMMANDS.includes(command as Command) || !filename)
    throw new Error(HELP);
  const options: Options = { command: command as Command, filename };
  const allowed = new Set(
    command === "tts"
      ? ["--voice", "--rate"]
      : command === "align"
        ? ["--audio", "--srt"]
        : command === "preview" || command === "render"
          ? ["--theme"]
          : [],
  );
  const seen = new Set<string>();
  for (let index = 0; index < rest.length; index += 2) {
    const flag = rest[index];
    const value = rest[index + 1];
    if (!allowed.has(flag) || !value || seen.has(flag))
      throw new Error(`Invalid or repeated option: ${flag}\n${HELP}`);
    seen.add(flag);
    if (flag === "--rate") options.rate = Number(value);
    else if (flag === "--voice") options.voice = value;
    else if (flag === "--audio") options.audio = value;
    else if (flag === "--srt") options.srt = value;
    else if (flag === "--theme") options.theme = value;
  }
  if (
    options.rate !== undefined &&
    (!Number.isInteger(options.rate) || options.rate < 80 || options.rate > 240)
  )
    throw new Error("Scratch speech rate must be 80 to 240 words per minute");
  if (command === "align" && (!options.audio || !options.srt))
    throw new Error("align requires --audio and --srt");
  return options;
}
